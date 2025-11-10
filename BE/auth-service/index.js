require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const authSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
});

const auth = mongoose.model('Auth', authSchema);



// API đăng ký
app.post('/register', async (req, res) => {
  const { studentId, username, password, email, fullName, phone } = req.body;
  try {
    // Kiểm tra trùng username hoặc studentId
    const existed = await auth.findOne({ $or: [{ username }, { studentId }] });
    if (existed) {
      return res.status(400).json({ message: 'Username hoặc studentId đã tồn tại' });
    }

    // Tạo tài khoản auth
    const newAuth = new auth({ studentId, username, password, email });
    await newAuth.save();

    // Tạo user ở user-service
    await axios.post('http://user-service:3002/users/add', {
      studentId,
      fullName,
      phone,
      email,
      balance: 50000000
    });

    // Tạo học phí ở tuition-service
    await axios.post('http://tuition-service:3005/tuitions/add', {
      studentId,
      tuitionAmount: 5000000,
      duedate: new Date(Date.now() + 30*24*60*60*1000), // hạn 30 ngày
      status: 'unpaid'
    });

    res.json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// API đăng nhập
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await auth.findOne({ username, password });
    console.log("User found:", user); // Xem user có studentId không
    if (!user) {
      return res.status(401).json({ message: 'tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { studentId: user.studentId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log("Token created:", token);
    console.log("Decoded token:", jwt.decode(token));
    res.json({
      message: 'Login successful',
      token,
      studentId: user.studentId,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});
// Chạy server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Auth Service running on port ${PORT}`));