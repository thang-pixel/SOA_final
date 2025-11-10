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

const tuitionSchema = new mongoose.Schema({
    studentId: { type: String, required: true, unique: true },
    tuitionAmount: { type: Number, required: true },
    duedate: { type: Date, required: true },
    status: { type: String, required: true, enum: ['paid', 'unpaid'], default: 'unpaid' },
});

const Tuition = mongoose.model('Tuition', tuitionSchema);
// API lấy thông tin học phí theo studentId
app.get('/tuitions/:studentId', async (req, res) => {
    try {
        const tuition = await Tuition.findOne({ studentId: req.params.studentId });
        if (!tuition) return res.status(404).send('Tuition record not found');
        res.send(tuition);
    } catch (error) {
        res.status(500).send('Server error');
    }
})

// Cập nhật trạng thái học phí theo studentId
app.put('/tuitions/:studentId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const tuition = await Tuition.findOneAndUpdate(
            { studentId: req.params.studentId },
            { status },
            { new: true }
        );
        if (!tuition) return res.status(404).send('Tuition record not found');
        res.send(tuition);
    } catch (error) {
        res.status(500).send('Server error');
    }
});

// API tạo học phí mới
app.post('/tuitions/add', async (req, res) => {
    try {
        const { studentId, tuitionAmount, duedate, status } = req.body;
        const existed = await Tuition.findOne({ studentId });
        if (existed) return res.status(400).json({ message: 'Tuition record đã tồn tại' });

        const tuition = new Tuition({ studentId, tuitionAmount, duedate, status });
        await tuition.save();
        res.json(tuition);
    } catch (error) {
        res.status(500).json({ message: 'Tuition Error' });
    }
});



app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});