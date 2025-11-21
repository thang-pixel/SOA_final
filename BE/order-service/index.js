require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
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

// Hàm gửi notification
async function sendNotification(notificationData) {
  try {
    await axios.post('http://localhost:3004/notifications/create', notificationData);
  } catch (error) {
    console.error('Error sending notification:', error);
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
    
    // Gửi email đến nhà cung cấp
    try {
      await axios.post('http://localhost:3004/send-order-email', {
        order: order.toObject(),
        supplier: order.supplier
      });
    } catch (emailError) {
      console.error('Error sending order email:', emailError);
    }
    
    // Tự động chuyển sang "delivered" sau 30 giây
    setTimeout(async () => {
      try {
        const updatedOrder = await ImportOrder.findById(id);
        if (updatedOrder && updatedOrder.status === 'processing') {
          updatedOrder.status = 'delivered';
          updatedOrder.deliveredAt = new Date();
          await updatedOrder.save();
          
          // Gửi thông báo yêu cầu tạo phiếu nhập kho
          await sendNotification({
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
    
    // Gửi thông báo hoàn thành
    await sendNotification({
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

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`);
});