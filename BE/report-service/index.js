require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const amqp = require('amqplib');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve static files
app.use('/reports', express.static(path.join(__dirname, 'reports')));

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Schema cho báo cáo
const reportSchema = new mongoose.Schema({
  reportCode: { type: String, required: true, unique: true },
  reportType: { 
    type: String, 
    enum: ['overview', 'import', 'export', 'inventory'], 
    required: true 
  },
  period: { 
    type: String, 
    enum: ['day', 'week', 'month'], 
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  data: { type: Object },
  filePath: { type: String },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  errorMessage: { type: String }
});

const Report = mongoose.model('Report', reportSchema);

// RabbitMQ connection
let rabbitConnection;
let rabbitChannel;

// Kết nối RabbitMQ
async function connectRabbitMQ() {
  try {
    rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitChannel = await rabbitConnection.createChannel();
    
    await rabbitChannel.assertQueue('report_queue', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });
    
    // Consumer xử lý báo cáo
    rabbitChannel.consume('report_queue', async (msg) => {
      if (msg) {
        try {
          const reportRequest = JSON.parse(msg.content.toString());
          console.log('Processing report:', reportRequest.reportCode);
          
          await processReport(reportRequest);
          rabbitChannel.ack(msg);
        } catch (error) {
          console.error('Error processing report:', error);
          rabbitChannel.nack(msg, false, false);
        }
      }
    });
    
    console.log('Report Service connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

// API tạo yêu cầu báo cáo
app.post('/report/create', async (req, res) => {
  try {
    const { reportType, period, createdBy, startDate, endDate } = req.body;
    
    const reportCode = `BC${Date.now()}`;
    
    const newReport = new Report({
      reportCode,
      reportType,
      period,
      startDate: startDate || getStartDate(period),
      endDate: endDate || new Date(),
      createdBy,
      status: 'pending'
    });
    
    await newReport.save();
    
    // Gửi vào queue để xử lý
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        'report_queue',
        Buffer.from(JSON.stringify({
          reportId: newReport._id,
          reportCode: newReport.reportCode,
          reportType: newReport.reportType,
          period: newReport.period,
          startDate: newReport.startDate,
          endDate: newReport.endDate,
          createdBy: newReport.createdBy
        })),
        { persistent: true }
      );
    }
    
    res.status(201).json({
      message: 'Yêu cầu báo cáo đã được tạo. Hệ thống đang xử lý...',
      report: newReport
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Lỗi tạo báo cáo', error: error.message });
  }
});

// Hàm tính startDate dựa trên period
function getStartDate(period) {
  const now = new Date();
  if (period === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  } else if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return now;
}

// Xử lý báo cáo
async function processReport(reportRequest) {
  try {
    const report = await Report.findById(reportRequest.reportId);
    if (!report) return;
    
    report.status = 'processing';
    await report.save();
    
    // Lấy dữ liệu từ các service
    const data = await fetchReportData(reportRequest);
    
    // Tạo PDF
    const filePath = await generatePDF(report, data);
    
    // Cập nhật report
    report.status = 'completed';
    report.data = data;
    report.filePath = filePath;
    report.completedAt = new Date();
    await report.save();
    
    // Gửi thông báo
    await sendNotification({
      title: 'Báo cáo hoàn thành',
      message: `Báo cáo ${getReportTypeName(report.reportType)} (${report.period}) đã sẵn sàng tải về`,
      type: 'success',
      relatedOrderId: report.reportCode,
      metadata: {
        type: 'report_completed',
        reportId: report._id,
        reportCode: report.reportCode,
        reportType: report.reportType,
        period: report.period,
        downloadUrl: `/api/report/download/${report._id}`
      }
    });
    
  } catch (error) {
    console.error('Error processing report:', error);
    const report = await Report.findById(reportRequest.reportId);
    if (report) {
      report.status = 'failed';
      report.errorMessage = error.message;
      await report.save();
    }
  }
}

// Lấy dữ liệu báo cáo
async function fetchReportData(reportRequest) {
  const { reportType, startDate, endDate } = reportRequest;
  
  try {
    if (reportType === 'overview') {
      // Lấy dữ liệu tổng quan
      const [importOrders, exportOrders, inventory] = await Promise.all([
        axios.get('http://localhost:3003/import/list'),
        axios.get('http://localhost:3003/export/list'),
        axios.get('http://localhost:3002/product/getAll')
      ]);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredImports = importOrders.data.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
      
      const filteredExports = exportOrders.data.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
      
      const totalImportAmount = filteredImports.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalExportAmount = filteredExports.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalImportItems = filteredImports.reduce((sum, order) => 
        sum + order.items.reduce((s, item) => s + (item.actualQuantity || item.quantity), 0), 0);
      const totalExportItems = filteredExports.reduce((sum, order) => 
        sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);
      
      return {
        overview: {
          totalImportOrders: filteredImports.length,
          totalExportOrders: filteredExports.length,
          totalImportAmount,
          totalExportAmount,
          totalImportItems,
          totalExportItems,
          revenue: totalExportAmount,
          profit: totalExportAmount - totalImportAmount,
          totalProducts: inventory.data.length,
          lowStockProducts: inventory.data.filter(p => p.stock < 10).length
        },
        topImportProducts: getTopProducts(filteredImports, true),
        topExportProducts: getTopProducts(filteredExports, false),
        dailyStats: getDailyStats(filteredImports, filteredExports, start, end)
      };
    } else if (reportType === 'import') {
      const response = await axios.get('http://localhost:3003/import/list');
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredOrders = response.data.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
      
      return {
        orders: filteredOrders,
        summary: {
          totalOrders: filteredOrders.length,
          totalAmount: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
          completedOrders: filteredOrders.filter(o => o.status === 'completed').length,
          pendingOrders: filteredOrders.filter(o => o.status !== 'completed').length
        }
      };
    } else if (reportType === 'export') {
      const response = await axios.get('http://localhost:3003/export/list');
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const filteredOrders = response.data.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
      
      return {
        orders: filteredOrders,
        summary: {
          totalOrders: filteredOrders.length,
          totalRevenue: filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
          totalItems: filteredOrders.reduce((sum, o) => 
            sum + o.items.reduce((s, i) => s + i.quantity, 0), 0)
        }
      };
    } else if (reportType === 'inventory') {
      const response = await axios.get('http://localhost:3002/product/getAll');
      return {
        products: response.data,
        summary: {
          totalProducts: response.data.length,
          totalValue: response.data.reduce((sum, p) => sum + (p.stock * p.cost), 0),
          lowStockProducts: response.data.filter(p => p.stock < 10).length,
          outOfStockProducts: response.data.filter(p => p.stock === 0).length
        }
      };
    }
  } catch (error) {
    console.error('Error fetching report data:', error);
    return {};
  }
}

function getTopProducts(orders, isImport) {
  const productMap = new Map();
  
  orders.forEach(order => {
    order.items.forEach(item => {
      const key = item.productCode;
      const quantity = isImport ? (item.actualQuantity || item.quantity) : item.quantity;
      
      if (productMap.has(key)) {
        const existing = productMap.get(key);
        existing.quantity += quantity;
        existing.totalAmount += item.totalPrice;
      } else {
        productMap.set(key, {
          productCode: item.productCode,
          productName: item.productName,
          quantity: quantity,
          totalAmount: item.totalPrice
        });
      }
    });
  });
  
  return Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}

function getDailyStats(importOrders, exportOrders, startDate, endDate) {
  const stats = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayImports = importOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dayStart && orderDate <= dayEnd;
    });
    
    const dayExports = exportOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dayStart && orderDate <= dayEnd;
    });
    
    stats.push({
      date: new Date(current),
      importOrders: dayImports.length,
      exportOrders: dayExports.length,
      importAmount: dayImports.reduce((sum, o) => sum + o.totalAmount, 0),
      exportAmount: dayExports.reduce((sum, o) => sum + o.totalAmount, 0)
    });
    
    current.setDate(current.getDate() + 1);
  }
  
  return stats;
}

// Tạo file PDF với font tiếng Việt
async function generatePDF(report, data) {
  return new Promise((resolve, reject) => {
    try {
      const reportsDir = path.join(__dirname, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const fileName = `${report.reportCode}_${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      // Tạo PDF với font hỗ trợ Unicode
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        bufferPages: true
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Đăng ký font tiếng Việt (sử dụng font có sẵn trong hệ thống)
      // Bạn có thể thay thế bằng đường dẫn đến font .ttf của riêng bạn
      try {
        // Sử dụng font Arial từ Windows
        const fontPath = 'C:/Windows/Fonts/arial.ttf';
        const fontBoldPath = 'C:/Windows/Fonts/arialbd.ttf';
        
        if (fs.existsSync(fontPath)) {
          doc.registerFont('Arial', fontPath);
          doc.font('Arial');
        }
        if (fs.existsSync(fontBoldPath)) {
          doc.registerFont('ArialBold', fontBoldPath);
        }
      } catch (fontError) {
        console.warn('Could not load custom font, using default:', fontError.message);
      }
      
      // Header
      doc.fontSize(20).font('ArialBold').text('BÁO CÁO QUẢN LÝ KHO', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).font('Arial').text(`Loại báo cáo: ${getReportTypeName(report.reportType)}`, { align: 'center' });
      doc.fontSize(12).text(`Kỳ báo cáo: ${getPeriodName(report.period)}`, { align: 'center' });
      doc.text(`Từ ${formatDate(report.startDate)} đến ${formatDate(report.endDate)}`, { align: 'center' });
      doc.text(`Mã báo cáo: ${report.reportCode}`, { align: 'center' });
      doc.moveDown(2);
      
      // Đường kẻ phân cách
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      // Content
      if (report.reportType === 'overview') {
        addOverviewContent(doc, data);
      } else if (report.reportType === 'import') {
        addImportContent(doc, data);
      } else if (report.reportType === 'export') {
        addExportContent(doc, data);
      } else if (report.reportType === 'inventory') {
        addInventoryContent(doc, data);
      }
      
      // Footer
      doc.fontSize(10).text(`Ngày tạo: ${formatDate(new Date())}`, 50, doc.page.height - 70, { align: 'right' });
      doc.text(`Người tạo: ${report.createdBy}`, { align: 'right' });
      doc.text('Báo cáo được tạo tự động bởi hệ thống', 50, doc.page.height - 40, { align: 'center' });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve(filePath);
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

function addOverviewContent(doc, data) {
  const { overview, topImportProducts, topExportProducts } = data;
  
  doc.fontSize(14).font('ArialBold').text('TỔNG QUAN', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11).font('Arial');
  doc.text(`Tổng đơn nhập: ${overview.totalImportOrders} đơn`);
  doc.text(`Tổng đơn xuất: ${overview.totalExportOrders} đơn`);
  doc.text(`Tổng tiền nhập: ${formatCurrency(overview.totalImportAmount)}`);
  doc.text(`Tổng tiền xuất: ${formatCurrency(overview.totalExportAmount)}`);
  doc.text(`Doanh thu: ${formatCurrency(overview.revenue)}`);
  doc.text(`Lợi nhuận: ${formatCurrency(overview.profit)}`);
  doc.text(`Tổng sản phẩm: ${overview.totalProducts}`);
  doc.text(`Sản phẩm sắp hết: ${overview.lowStockProducts}`);
  
  doc.moveDown(2);
  doc.fontSize(14).font('ArialBold').text('TOP 10 SẢN PHẨM NHẬP NHIỀU NHẤT', { underline: true });
  doc.moveDown();
  doc.fontSize(10).font('Arial');
  
  topImportProducts.forEach((product, index) => {
    doc.text(`${index + 1}. ${product.productName} - SL: ${product.quantity} - ${formatCurrency(product.totalAmount)}`);
  });
  
  doc.moveDown(2);
  doc.fontSize(14).font('ArialBold').text('TOP 10 SẢN PHẨM BÁN CHẠY', { underline: true });
  doc.moveDown();
  doc.fontSize(10).font('Arial');
  
  topExportProducts.forEach((product, index) => {
    doc.text(`${index + 1}. ${product.productName} - SL: ${product.quantity} - ${formatCurrency(product.totalAmount)}`);
  });
}

function addImportContent(doc, data) {
  const { orders, summary } = data;
  
  doc.fontSize(14).font('ArialBold').text('BÁO CÁO NHẬP HÀNG', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11).font('Arial');
  doc.text(`Tổng đơn nhập: ${summary.totalOrders} đơn`);
  doc.text(`Tổng tiền: ${formatCurrency(summary.totalAmount)}`);
  doc.text(`Đơn hoàn thành: ${summary.completedOrders}`);
  doc.text(`Đơn đang xử lý: ${summary.pendingOrders}`);
  
  doc.moveDown(2);
  doc.fontSize(12).font('ArialBold').text('CHI TIẾT CÁC ĐƠN NHẬP HÀNG', { underline: true });
  doc.moveDown();
  doc.fontSize(9).font('Arial');
  
  orders.slice(0, 20).forEach((order, index) => {
    doc.text(`${index + 1}. ${order.orderCode} - ${order.supplier} - ${formatCurrency(order.totalAmount)} - ${order.status}`);
  });
  
  if (orders.length > 20) {
    doc.text(`... và ${orders.length - 20} đơn hàng khác`);
  }
}

function addExportContent(doc, data) {
  const { orders, summary } = data;
  
  doc.fontSize(14).font('ArialBold').text('BÁO CÁO XUẤT HÀNG', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11).font('Arial');
  doc.text(`Tổng phiếu xuất: ${summary.totalOrders} phiếu`);
  doc.text(`Tổng doanh thu: ${formatCurrency(summary.totalRevenue)}`);
  doc.text(`Tổng số lượng: ${summary.totalItems} sản phẩm`);
  
  doc.moveDown(2);
  doc.fontSize(12).font('ArialBold').text('CHI TIẾT CÁC PHIẾU XUẤT HÀNG', { underline: true });
  doc.moveDown();
  doc.fontSize(9).font('Arial');
  
  orders.slice(0, 20).forEach((order, index) => {
    doc.text(`${index + 1}. ${order.receiptCode} - ${order.customerName || 'Khách lẻ'} - ${formatCurrency(order.totalAmount)}`);
  });
  
  if (orders.length > 20) {
    doc.text(`... và ${orders.length - 20} phiếu xuất khác`);
  }
}

function addInventoryContent(doc, data) {
  const { products, summary } = data;
  
  doc.fontSize(14).font('ArialBold').text('BÁO CÁO TỒN KHO', { underline: true });
  doc.moveDown();
  
  doc.fontSize(11).font('Arial');
  doc.text(`Tổng sản phẩm: ${summary.totalProducts}`);
  doc.text(`Tổng giá trị: ${formatCurrency(summary.totalValue)}`);
  doc.text(`Sản phẩm sắp hết: ${summary.lowStockProducts}`);
  doc.text(`Sản phẩm hết hàng: ${summary.outOfStockProducts}`);
  
  doc.moveDown(2);
  doc.fontSize(12).font('ArialBold').text('CHI TIẾT TỒN KHO', { underline: true });
  doc.moveDown();
  doc.fontSize(9).font('Arial');
  
  products.slice(0, 30).forEach((product, index) => {
    doc.text(`${index + 1}. ${product.code} - ${product.name} - Tồn: ${product.stock} - ${formatCurrency(product.price)}`);
  });
  
  if (products.length > 30) {
    doc.text(`... và ${products.length - 30} sản phẩm khác`);
  }
}

function getReportTypeName(type) {
  const names = {
    overview: 'Tổng quan',
    import: 'Nhập hàng',
    export: 'Xuất hàng',
    inventory: 'Tồn kho'
  };
  return names[type] || type;
}

function getPeriodName(period) {
  const periods = {
    day: 'Ngày',
    week: 'Tuần',
    month: 'Tháng'
  };
  return periods[period] || period;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('vi-VN');
}

function formatCurrency(amount) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

async function sendNotification(notificationData) {
  try {
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        'notification_queue',
        Buffer.from(JSON.stringify(notificationData)),
        { persistent: true }
      );
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

// API lấy danh sách báo cáo
app.get('/report/list', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách báo cáo' });
  }
});

// API tải báo cáo
app.get('/report/download/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report || !report.filePath) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo' });
    }
    
    if (!fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: 'File báo cáo không tồn tại' });
    }
    
    res.download(report.filePath, `${report.reportCode}.pdf`);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ message: 'Lỗi tải báo cáo' });
  }
});

// API lấy dữ liệu thống kê real-time
app.get('/report/stats', async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const startDate = getStartDate(period);
    const endDate = new Date();
    
    const data = await fetchReportData({
      reportType: 'overview',
      startDate,
      endDate
    });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê' });
  }
});

connectRabbitMQ();

process.on('SIGINT', async () => {
  try {
    if (rabbitChannel) await rabbitChannel.close();
    if (rabbitConnection) await rabbitConnection.close();
    console.log('RabbitMQ connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Report service running on port ${PORT}`);
});