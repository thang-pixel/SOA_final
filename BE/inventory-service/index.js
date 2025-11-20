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
  createdAt: { type: Date, default: Date.now },                 // Thời gian tạo
  expectedOutOfStock: { type: Date },                           // Dự kiến hết hàng
  image: { type: String  },                                      // Ảnh sản phẩm
  category: { type: String  },                                   // Loại sản phẩm
  supplier: { type: String  },                                   // Nhà cung cấp
});


const inventory = mongoose.model('Inventory', inventorySchema);

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
        
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
});
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Inventory service running on port ${PORT}`);
});