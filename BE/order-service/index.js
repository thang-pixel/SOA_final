require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const amqp = require('amqplib'); // Thêm RabbitMQ
const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Schema cho đơn nhập hàng
const importOrderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  supplier: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'processing', 'delivered', 'completed', 'cancelled'], 
    default: 'draft' 
  },
  items: [{
    productId: { type: String, required: true },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    actualQuantity: { type: Number, default: null },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  processedAt: { type: Date },
  deliveredAt: { type: Date },
  completedAt: { type: Date },
  warehouseReceiptCode: { type: String }
});

const ImportOrder = mongoose.model('ImportOrder', importOrderSchema);

// Helper function để log hoạt động
async function logActivity(username, action, description, metadata = {}) {
  try {
    await axios.post('http://localhost:3005/activity/log', {
      username,
      action,
      description,
      metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging activity:', error.message);
  }
}


// Schema cho phiếu xuất hàng
const exportOrderSchema = new mongoose.Schema({
  receiptCode: { type: String, required: true, unique: true },
  customerName: { type: String, default: 'Khách hàng' },
  customerPhone: { type: String, default: '' },
  items: [{
    productId: { type: String, required: true },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer'], default: 'cash' },
  status: { type: String, enum: ['completed'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  notes: { type: String }
});

const ExportOrder = mongoose.model('ExportOrder', exportOrderSchema);

// API tạo phiếu xuất hàng
app.post('/export/create', async (req, res) => {
  try {
    const { items, customerName, customerPhone, paymentMethod, createdBy, notes } = req.body;
    
    const receiptCode = `PXH${Date.now()}`;
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const newExportOrder = new ExportOrder({
      receiptCode,
      customerName,
      customerPhone,
      items,
      totalAmount,
      paymentMethod,
      notes,
      createdBy
    });
    
    await newExportOrder.save();
    
    // Gửi thông báo qua RabbitMQ
    await sendNotificationMessage({
      title: 'Tạo phiếu xuất hàng thành công',
      message: `Phiếu xuất hàng ${receiptCode} đã được tạo với tổng tiền ${totalAmount.toLocaleString('vi-VN')}đ`,
      type: 'success',
      relatedOrderId: receiptCode,
      metadata: { 
        receiptCode,
        totalAmount,
        customerName,
        type: 'export'
      }
    });
    
    res.status(201).json(newExportOrder);
  } catch (error) {
    console.error('Error creating export order:', error);
    res.status(500).json({ message: 'Lỗi tạo phiếu xuất hàng', error: error.message });
  }
});

// API lấy danh sách phiếu xuất hàng
app.get('/export/list', async (req, res) => {
  try {
    const orders = await ExportOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching export orders:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách phiếu xuất hàng' });
  }
});

// API lấy chi tiết phiếu xuất hàng
app.get('/export/:id', async (req, res) => {
  try {
    const order = await ExportOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu xuất hàng' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching export order:', error);
    res.status(500).json({ message: 'Lỗi lấy chi tiết phiếu xuất hàng' });
  }
});

// API thống kê xuất hàng theo ngày/tháng
app.get('/export/stats/:period', async (req, res) => {
  try {
    const { period } = req.params; // 'day', 'month', 'year'
    const now = new Date();
    let startDate;
    
    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    
    const stats = await ExportOrder.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalItems: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);
    
    res.json(stats[0] || { totalOrders: 0, totalRevenue: 0, totalItems: 0 });
  } catch (error) {
    console.error('Error fetching export stats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê xuất hàng' });
  }
});

// RabbitMQ connection
let rabbitConnection;
let rabbitChannel;

// Kết nối RabbitMQ
async function connectRabbitMQ() {
  try {
    rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitChannel = await rabbitConnection.createChannel();
    
    // Tạo queue cho email và notification
    await rabbitChannel.assertQueue('email_queue', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });
    
    console.log('Order Service connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    // Retry connection sau 5 giây
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Hàm gửi message vào notification queue
async function sendNotificationMessage(notificationData) {
  try {
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        'notification_queue', 
        Buffer.from(JSON.stringify(notificationData)),
        { persistent: true }
      );
      console.log('Notification message sent to queue:', notificationData.title);
    } else {
      console.error('RabbitMQ channel not available, falling back to direct API call');
      // Fallback: gọi trực tiếp API nếu RabbitMQ không khả dụng
      await axios.post('http://localhost:3004/notifications/create', notificationData);
    }
  } catch (error) {
    console.error('Error sending notification message:', error);
    // Fallback: gọi trực tiếp API nếu có lỗi
    try {
      await axios.post('http://localhost:3004/notifications/create', notificationData);
    } catch (apiError) {
      console.error('Error with fallback API call:', apiError);
    }
  }
}

// Hàm gửi email message vào email queue
async function sendEmailMessage(emailData) {
  try {
    if (rabbitChannel) {
      rabbitChannel.sendToQueue(
        'email_queue', 
        Buffer.from(JSON.stringify(emailData)),
        { persistent: true }
      );
      console.log('Email message sent to queue for order:', emailData.order.orderCode);
    } else {
      console.error('RabbitMQ channel not available, falling back to direct API call');
      // Fallback: gọi trực tiếp API nếu RabbitMQ không khả dụng
      await axios.post('http://localhost:3004/send-order-email', emailData);
    }
  } catch (error) {
    console.error('Error sending email message:', error);
    // Fallback: gọi trực tiếp API nếu có lỗi
    try {
      await axios.post('http://localhost:3004/send-order-email', emailData);
    } catch (apiError) {
      console.error('Error with fallback API call:', apiError);
    }
  }
}

// API tạo đơn nhập hàng mới
app.post('/import/create', async (req, res) => {
  try {
    const { items, supplier, createdBy, notes } = req.body;
    
    const orderCode = `NH${Date.now()}`;
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const newOrder = new ImportOrder({
      orderCode,
      supplier,
      items,
      totalAmount,
      notes,
      createdBy
    });
    
    await newOrder.save();
    
    // Log hoạt động tạo đơn nhập hàng
    await logActivity(createdBy, 'create_import_order', `Đã tạo đơn nhập hàng ${orderCode} từ nhà cung cấp ${supplier}`, {
      orderCode,
      supplier,
      totalAmount,
      itemCount: items.length
    });
    
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating import order:', error);
    res.status(500).json({ message: 'Lỗi tạo đơn nhập hàng', error: error.message });
  }
});

// API gửi đơn hàng cho nhà cung cấp xử lý
app.put('/import/submit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await ImportOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    
    if (order.status !== 'draft') {
      return res.status(400).json({ message: 'Đơn hàng đã được gửi đi' });
    }
    
    // Cập nhật trạng thái thành "processing"
    order.status = 'processing';
    order.processedAt = new Date();
    await order.save();
    
    // Log hoạt động gửi đơn hàng
    await logActivity(order.createdBy, 'submit_import_order', `Đã gửi đơn nhập hàng ${order.orderCode} cho nhà cung cấp xử lý`, {
      orderCode: order.orderCode,
      supplier: order.supplier
    });
    
    // Gửi email đến nhà cung cấp qua RabbitMQ
    await sendEmailMessage({
      order: order.toObject(),
      supplier: order.supplier
    });
    
    // Tự động chuyển sang "delivered" sau 30 giây
    setTimeout(async () => {
      try {
        const updatedOrder = await ImportOrder.findById(id);
        if (updatedOrder && updatedOrder.status === 'processing') {
          updatedOrder.status = 'delivered';
          updatedOrder.deliveredAt = new Date();
          await updatedOrder.save();
          
          // Gửi thông báo yêu cầu tạo phiếu nhập kho qua RabbitMQ
          await sendNotificationMessage({
            title: 'Đơn hàng đã được giao',
            message: `Đơn hàng ${updatedOrder.orderCode} đã được giao. Vui lòng tạo phiếu nhập kho.`,
            type: 'warning',
            relatedOrderId: updatedOrder.orderCode,
            metadata: { 
              orderCode: updatedOrder.orderCode,
              supplier: updatedOrder.supplier,
              action: 'create_warehouse_receipt'
            }
          });
          
          console.log(`Order ${order.orderCode} delivered automatically`);
        }
      } catch (error) {
        console.error('Error auto-updating order status:', error);
      }
    }, 30000); // 30 giây
    
    res.json(order);
  } catch (error) {
    console.error('Error submitting import order:', error);
    res.status(500).json({ message: 'Lỗi gửi đơn nhập hàng', error: error.message });
  }
});

// API tạo phiếu nhập kho và cập nhật tồn kho
app.put('/import/create-receipt/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { actualQuantities, warehouseStaff } = req.body;
    
    const order = await ImportOrder.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Đơn hàng chưa được giao' });
    }
    
    const warehouseReceiptCode = `PNK${Date.now()}`;
    
    // Cập nhật số lượng thực tế cho từng sản phẩm
    for (const actualQty of actualQuantities) {
      const itemIndex = order.items.findIndex(item => item.productId === actualQty.productId);
      if (itemIndex !== -1) {
        order.items[itemIndex].actualQuantity = actualQty.actualQuantity;
        
        // Cập nhật tồn kho trong inventory service
        try {
          await axios.put(`http://localhost:3002/product/update-stock/${actualQty.productId}`, {
            quantity: actualQty.actualQuantity,
            operation: 'increase'
          });
        } catch (error) {
          console.error('Error updating inventory:', error);
        }
      }
    }
    
    // Cập nhật trạng thái đơn hàng
    order.status = 'completed';
    order.completedAt = new Date();
    order.warehouseReceiptCode = warehouseReceiptCode;
    await order.save();
    
    // Log hoạt động tạo phiếu nhập kho
    await logActivity(warehouseStaff, 'create_warehouse_receipt', `Đã tạo phiếu nhập kho ${warehouseReceiptCode} cho đơn hàng ${order.orderCode}`, {
      orderCode: order.orderCode,
      warehouseReceiptCode,
      totalItems: actualQuantities.length
    });
    
    // Gửi thông báo hoàn thành qua RabbitMQ
    await sendNotificationMessage({
      title: 'Phiếu nhập kho đã được tạo',
      message: `Phiếu nhập kho ${warehouseReceiptCode} cho đơn hàng ${order.orderCode} đã được tạo thành công.`,
      type: 'success',
      relatedOrderId: order.orderCode,
      metadata: { 
        orderCode: order.orderCode,
        warehouseReceiptCode,
        warehouseStaff
      }
    });
    
    res.json(order);
  } catch (error) {
    console.error('Error creating warehouse receipt:', error);
    res.status(500).json({ message: 'Lỗi tạo phiếu nhập kho', error: error.message });
  }
});

// API lấy danh sách đơn nhập hàng
app.get('/import/list', async (req, res) => {
  try {
    const orders = await ImportOrder.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching import orders:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách đơn nhập hàng' });
  }
});

// API lấy chi tiết đơn nhập hàng
app.get('/import/:id', async (req, res) => {
  try {
    const order = await ImportOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching import order:', error);
    res.status(500).json({ message: 'Lỗi lấy chi tiết đơn nhập hàng' });
  }
});

// Khởi tạo RabbitMQ connection khi server start
connectRabbitMQ();

// Graceful shutdown
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

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});