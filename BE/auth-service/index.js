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

const authSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
});




const auth = mongoose.model('Auth', authSchema);


// API đăng nhập
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await auth.findOne({ username, password });
    console.log("User found:", user); 
    if (!user) {
      return res.status(401).json({ message: 'tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const userObj = user.toObject();
    delete userObj.password;
    res.json({
      message: 'Login successful',
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});







// API đăng nhập
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await auth.findOne({ username, password });
    console.log("User found:", user); 
    if (!user) {
      return res.status(401).json({ message: 'tài khoản hoặc mật khẩu không chính xác' });
    }

    const token = jwt.sign(
      { username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log("Token created:", token);
    console.log("Decoded token:", jwt.decode(token));
    const userObj = user.toObject();
    delete userObj.password;
    res.json({
      message: 'Login successful',
      token,
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

//API đăng ký
app.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const existingUser = await auth.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Tên tài khoản đã tồn tại' });
    }

    const newUser = new auth({ username, password, email });
    await newUser.save();

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Chạy server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Auth Service running on port ${PORT}`));