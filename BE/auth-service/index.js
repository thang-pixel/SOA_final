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
}, { versionKey: false });


const auth = mongoose.model('Auth', authSchema);

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
    
    // Log hoạt động đăng nhập (không await để không chặn response)
    logActivity(user.username, 'login', `${user.username} đã đăng nhập vào hệ thống`, {
      role: user.role,
      email: user.email
    });
    
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

    // Log hoạt động đăng ký (không await để không chặn response)
    logActivity(username, 'register', `${username} đã đăng ký tài khoản mới`, {
      email: email
    });

    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// API Lấy danh sách tất cả user (GET /users)
app.get('/users', async (req, res) => {
  try {

    const users = await auth.find().select('-password -__v'); 
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// API Cập nhật thông tin user (PUT /users/:id)
app.put('/users/:id', async (req, res) => {
  try {
    const { email, role } = req.body;
    const updatedUser = await auth.findByIdAndUpdate(
      req.params.id,
      { email, role },
      { new: true } // Trả về document đã được cập nhật
    ).select('-password -__v');

    if (!updatedUser) return res.status(404).json({ message: 'Không tìm thấy user' });
    
    // Log hoạt động cập nhật user (không await để không chặn response)
    const adminUsername = req.body.adminUsername || 'admin';
    logActivity(adminUsername, 'update_user', `Đã cập nhật thông tin tài khoản ${updatedUser.username}`, {
      userId: updatedUser._id,
      updates: { email, role }
    });
    
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật' });
  }
});

// API Xóa user (DELETE /users/:id)
app.delete('/users/:id', async (req, res) => {
  try {
    const deletedUser = await auth.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ message: 'Không tìm thấy user' });
    
    // Log hoạt động xóa user (không await để không chặn response)
    const adminUsername = req.body.adminUsername || 'admin';
    logActivity(adminUsername, 'delete_user', `Đã xóa tài khoản ${deletedUser.username}`, {
      userId: deletedUser._id,
      deletedUsername: deletedUser.username
    });
    
    res.json({ message: 'Xóa thành công' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi xóa user' });
  }
});

// Chạy server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Auth Service running on port ${PORT}`));