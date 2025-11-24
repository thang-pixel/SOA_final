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

// Sử dụng đường dẫn tuyệt đối trong container
const IMG_DIR = process.env.NODE_ENV === 'production' 
  ? '/app/public/img' 
  : path.join(__dirname, '../../FE/vite-SOA_final/public/img');

const upload = multer({
  dest: IMG_DIR
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
    await axios.post('http://activity-service:3005/activity/log', {
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
  fs.readdir(IMG_DIR, (err, files) => {
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

// API lấy lịch sử xuất nhập kho của một sản phẩm
app.get('/product/history/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 50 } = req.query;
        
        // Lấy thông tin sản phẩm
        const product = await inventory.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }

        // Gọi API từ order-service để lấy lịch sử
        const [importHistory, exportHistory] = await Promise.all([
            // Lấy lịch sử nhập hàng
            axios.get(`http://order-service:3003/import/history/${productId}?page=${page}&limit=${limit}`).catch(() => ({ data: [] })),
            // Lấy lịch sử xuất hàng  
            axios.get(`http://order-service:3003/export/history/${productId}?page=${page}&limit=${limit}`).catch(() => ({ data: [] }))
        ]);

        // Kết hợp và sắp xếp theo thời gian
        const allHistory = [
            ...importHistory.data.map(item => ({ ...item, type: 'import' })),
            ...exportHistory.data.map(item => ({ ...item, type: 'export' }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({
            product,
            history: allHistory,
            totalCount: allHistory.length
        });
    } catch (error) {
        console.error('Error fetching product history:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// Helper function để kiểm tra và gửi thông báo tồn kho thấp
async function checkLowStockAndNotify(product) {
  try {
    if (product.stock < product.minStockThreshold) {
      await axios.post('http://notification-service:3004/notifications/create', {
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


// API xóa sản phẩm đơn lẻ
app.delete('/product/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { deletedBy } = req.body;
        
        const product = await inventory.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
        
        await inventory.findByIdAndDelete(id);
        
        // Log hoạt động xóa sản phẩm
        const username = deletedBy || 'admin';
        await logActivity(username, 'delete_product', `Đã xóa sản phẩm ${product.name} (${product.code})`, {
            productId: product._id,
            productCode: product.code,
            productName: product.name,
            stock: product.stock
        });
        
        res.json({ message: 'Xóa sản phẩm thành công', deletedProduct: product });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

// API xóa nhiều sản phẩm
app.delete('/product/delete-multiple', async (req, res) => {
    try {
        const { productIds, deletedBy } = req.body;
        
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ message: 'Danh sách sản phẩm không hợp lệ' });
        }
        
        // Lấy thông tin các sản phẩm trước khi xóa để log
        const productsToDelete = await inventory.find({ _id: { $in: productIds } });
        
        const result = await inventory.deleteMany({ _id: { $in: productIds } });
        
        // Log hoạt động xóa nhiều sản phẩm
        const username = deletedBy || 'admin';
        await logActivity(username, 'delete_multiple_products', `Đã xóa ${result.deletedCount} sản phẩm`, {
            deletedCount: result.deletedCount,
            productIds: productIds,
            deletedProducts: productsToDelete.map(p => ({ id: p._id, code: p.code, name: p.name }))
        });
        
        res.json({ 
            message: `Xóa thành công ${result.deletedCount} sản phẩm`,
            deletedCount: result.deletedCount,
            deletedProducts: productsToDelete
        });
    } catch (error) {
        console.error('Error deleting multiple products:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});

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