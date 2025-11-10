require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    balance: { type: Number, required: true, default: 0 },
    // Thêm field để track processing
    lastUpdated: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// API lấy thông tin người dùng theo studentId
app.get('/users/:studentId', async (req, res) => {
    console.log('User-service received:', req.method, req.originalUrl);
    try {
        const user = await User.findOne({ studentId: req.params.studentId });
        if (!user) return res.status(404).send('User not found');
        res.send(user);
    } catch (error) {
        res.status(500).send('Server error');
    }
});



// API tạo user mới
app.post('/users/add', async (req, res) => {
    try {
        const { studentId, fullName, phone, email, balance } = req.body;
        const existed = await User.findOne({ studentId });
        if (existed) return res.status(400).json({ message: 'User đã tồn tại' });

        const user = new User({ studentId, fullName, phone, email, balance });
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Cập nhật số dư với atomic operation
app.put('/users/:studentId/balance', async (req, res) => {
    try {
        const { balance } = req.body;
        const studentId = req.params.studentId;

        // Sử dụng findOneAndUpdate với atomic operation
        const user = await User.findOneAndUpdate(
            { 
                studentId,
                balance: { $gte: 0 } // Đảm bảo balance không âm
            },
            { 
                balance,
                lastUpdated: new Date()
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found or invalid balance operation' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// API cập nhật balance với kiểm tra điều kiện
app.put('/users/:studentId/balance/conditional', async (req, res) => {
    try {
        const { newBalance, expectedCurrentBalance } = req.body;
        const studentId = req.params.studentId;

        // Cập nhật chỉ khi balance hiện tại đúng với expected
        const user = await User.findOneAndUpdate(
            { 
                studentId,
                balance: expectedCurrentBalance
            },
            { 
                balance: newBalance,
                lastUpdated: new Date()
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!user) {
            return res.status(409).json({ 
                message: 'Balance has been modified by another transaction' 
            });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating balance conditionally:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(process.env.PORT, () => {
    console.log(`User service running on port ${process.env.PORT}`);
});