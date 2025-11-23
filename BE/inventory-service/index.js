require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const app = express();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const upload = multer({
  dest: path.join(__dirname, '../../FE/vite-SOA_final/public/img')
});

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

const inventorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },         // Mã hàng
  name: { type: String, required: true },                       // Tên hàng
  price: { type: Number, required: true },                      // Giá bán
  cost: { type: Number, required: true },                       // Giá vốn
  stock: { type: Number, required: true },                      // Tồn kho
  ordered: { type: Number, default: 0 },                        // Khách đặt
  minStockThreshold: { type: Number, default: 10 },             // Ngưỡng tồn kho tối thiểu
  createdAt: { type: Date, default: Date.now },                 // Thời gian tạo
  expectedOutOfStock: { type: Date },                           // Dự kiến hết hàng
  image: { type: String  },                                      // Ảnh sản phẩm
  category: { type: String  },                                   // Loại sản phẩm
  supplier: { type: String  },                                   // Nhà cung cấp
});


const inventory = mongoose.model('Inventory', inventorySchema);

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

// API lấy danh sách hàng tồn kho
app.get('/product/getAll', async (req, res) => {
    try {
        const items = await inventory.find();
        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

//API thêm hàng tồn kho
app.post('/product/add', async (req, res) => {
    try {
        const newItem = new inventory(req.body);
        await newItem.save();
        
        // Log hoạt động thêm sản phẩm
        const username = req.body.createdBy || 'admin';
        await logActivity(username, 'create_product', `Đã thêm sản phẩm ${newItem.name} (${newItem.code})`, {
          productId: newItem._id,
          productCode: newItem.code,
          productName: newItem.name,
          stock: newItem.stock
        });
        
        res.status(201).json(newItem);
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});


// API upload ảnh
app.post('/upload-img', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // Trả về đường dẫn ảnh để lưu vào DB
  res.json({ path: `/img/${req.file.filename}` });
});

//API trả về ảnh
app.get('/img', (req, res) => {
  const imgDir = path.join(__dirname, '../../FE/vite-SOA_final/public/img');
  fs.readdir(imgDir, (err, files) => {
    if (err) return res.status(500).json([]);
    res.json(files.filter(f => /\.(jpg|jpeg|png|jfif)$/i.test(f)));
  });
});

//API chỉnh sửa hàng tồn kho
app.put('/product/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedItem = await inventory.findByIdAndUpdate(
            id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedItem) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        
        // Log hoạt động cập nhật sản phẩm
        const username = req.body.updatedBy || 'admin';
        await logActivity(username, 'update_product', `Đã cập nhật sản phẩm ${updatedItem.name} (${updatedItem.code})`, {
          productId: updatedItem._id,
          productCode: updatedItem.code,
          productName: updatedItem.name
        });
        
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});



// API cập nhật tồn kho
app.put('/product/update-stock/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, operation } = req.body; // operation: 'increase' hoặc 'decrease'
        
        const product = await inventory.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        
        if (operation === 'increase') {
            product.stock += quantity;
        } else if (operation === 'decrease') {
            product.stock = Math.max(0, product.stock - quantity);
        }
        
        await product.save();
        
        // Kiểm tra và gửi thông báo nếu tồn kho thấp
        await checkLowStockAndNotify(product);
        
        res.json(product);
    } catch (error) {
        console.error('Error updating stock:', error);
        res.status(500).json({ message: 'Lỗi cập nhật tồn kho', error: error.message });
    }
});

// Helper function để kiểm tra và gửi thông báo tồn kho thấp
async function checkLowStockAndNotify(product) {
  try {
    if (product.stock < product.minStockThreshold) {
      await axios.post('http://localhost:3004/notifications/create', {
        title: '⚠️ Cảnh báo: Tồn kho thấp',
        message: `Sản phẩm "${product.name}" (${product.code}) chỉ còn ${product.stock} sản phẩm, dưới ngưỡng tối thiểu ${product.minStockThreshold}`,
        type: 'warning',
        metadata: {
          productId: product._id,
          productCode: product.code,
          productName: product.name,
          currentStock: product.stock,
          minThreshold: product.minStockThreshold,
          supplier: product.supplier
        }
      });
      console.log(`Low stock notification sent for ${product.code}`);
    }
  } catch (error) {
    console.error('Error sending low stock notification:', error.message);
  }
}

// API kiểm tra tất cả sản phẩm dưới ngưỡng tồn kho
app.get('/product/low-stock', async (req, res) => {
    try {
        const lowStockProducts = await inventory.find({
            $expr: { $lt: ['$stock', '$minStockThreshold'] }
        }).sort({ stock: 1 });
        
        res.json({
            count: lowStockProducts.length,
            products: lowStockProducts
        });
    } catch (error) {
        console.error('Error fetching low stock products:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API cập nhật ngưỡng tồn kho tối thiểu
app.put('/product/update-threshold/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { minStockThreshold } = req.body;
        
        const product = await inventory.findByIdAndUpdate(
            id,
            { minStockThreshold },
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        
        // Kiểm tra ngay sau khi cập nhật ngưỡng
        await checkLowStockAndNotify(product);
        
        const username = req.body.updatedBy || 'admin';
        await logActivity(username, 'update_threshold', `Đã cập nhật ngưỡng tồn kho cho ${product.name} (${product.code}) thành ${minStockThreshold}`, {
          productId: product._id,
          productCode: product.code,
          minStockThreshold
        });
        
        res.json(product);
    } catch (error) {
        console.error('Error updating threshold:', error);
        res.status(500).json({ message: 'Lỗi cập nhật ngưỡng', error: error.message });
    }
});

// API quét tất cả sản phẩm và gửi thông báo cho những sản phẩm dưới ngưỡng
app.post('/product/check-all-low-stock', async (req, res) => {
    try {
        const lowStockProducts = await inventory.find({
            $expr: { $lt: ['$stock', '$minStockThreshold'] }
        });
        
        let notificationsSent = 0;
        for (const product of lowStockProducts) {
            await checkLowStockAndNotify(product);
            notificationsSent++;
        }
        
        res.json({
            message: `Đã quét xong. Tìm thấy ${lowStockProducts.length} sản phẩm dưới ngưỡng tồn kho.`,
            count: lowStockProducts.length,
            notificationsSent
        });
    } catch (error) {
        console.error('Error checking all low stock:', error);
        res.status(500).json({ message: 'Lỗi quét tồn kho', error: error.message });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Inventory service running on port ${PORT}`);
});