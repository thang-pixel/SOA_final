
const { v4: uuidv4 } = require('uuid'); 
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const amqp = require('amqplib');
const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const paymentSchema = new mongoose.Schema({
    paymentId: { type: String, required: true, unique: true }, 
    amount: { type: Number, required: true },
    payerId: { type: String, required: true },
    status: { type: String, required: true, enum: ['completed', 'pending', 'failed'], default: 'pending' },
    studentId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    isProcessing: { type: Boolean, default: false },
    processingBy: { type: String, default: null }
});
const Payment = mongoose.model('Payment', paymentSchema);

// API tạo giao dịch thanh toán mới
app.post('/payments', async (req, res) => {
    try {
        const { payerId, studentId, email } = req.body;
        
        const existingPayment = await Payment.findOne({ 
            studentId, 
            status: 'pending' 
        });

        if (existingPayment) {
            await sendOtpToQueue({ 
                transactionId: existingPayment.paymentId, 
                email 
            });
            
            return res.status(200).json({ 
                message: 'Giao dịch chờ đã tồn tại, OTP đã được gửi lại', 
                paymentId: existingPayment.paymentId 
            });
        }

        const tuitionRes = await axios.get(`http://tuition-service:3005/tuitions/${studentId}`);
        if (!tuitionRes.data || tuitionRes.status !== 200) {
            return res.status(404).json({ message: 'Không tìm thấy thông tin học phí' });
        }
        const tuition = tuitionRes.data;

        if (tuition.status === 'paid') {
            return res.status(400).json({ message: 'Học phí đã được thanh toán' });
        }

        const amount = tuition.tuitionAmount;
        const paymentId = uuidv4();
        const payment = new Payment({ paymentId, amount, payerId, studentId, status: 'pending' });
        await payment.save();

        await sendOtpToQueue({ transactionId: paymentId, email });

        res.status(201).json({ message: 'Giao dịch đã được tạo, OTP đã được gửi', paymentId });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// Cập nhật trạng thái giao dịch - Đơn giản hóa để tránh lỗi
app.put('/payments/:paymentId/status', async (req, res) => {
    try {
        const { status } = req.body;
        const paymentId = req.params.paymentId;

        console.log('Updating payment status:', paymentId, 'to', status);

        // 1. Tìm payment record
        const payment = await Payment.findOne({ paymentId });
        if (!payment) {
            console.error('Payment not found:', paymentId);
            return res.status(404).json({ message: 'Không tìm thấy giao dịch' });
        }

        // 2. Kiểm tra trạng thái hiện tại
        if (payment.status !== 'pending') {
            console.error('Payment not pending:', payment.status);
            return res.status(400).json({ message: 'Giao dịch không trong trạng thái chờ' });
        }

        // 3. Kiểm tra processing lock đơn giản
        if (payment.isProcessing) {
            console.error('Payment is being processed');
            return res.status(409).json({ message: 'Giao dịch đang được xử lý, vui lòng thử lại sau' });
        }

        if (status === 'completed') {
            // 4. Đánh dấu đang xử lý
            await Payment.updateOne(
                { paymentId },
                { 
                    isProcessing: true, 
                    processingBy: paymentId 
                }
            );

            try {
                // 5. Kiểm tra học phí
                const tuitionCheck = await axios.get(`http://tuition-service:3005/tuitions/${payment.studentId}`);
                if (tuitionCheck.data.status === 'paid') {
                    throw new Error('Học phí đã được thanh toán bởi giao dịch khác');
                }

                // 6. Lấy thông tin user
                const userRes = await axios.get(`http://user-service:3002/users/${payment.payerId}`);
                const user = userRes.data;

                if (user.balance < payment.amount) {
                    throw new Error('Số dư không đủ');
                }

                // 7. Cập nhật số dư user
                const newBalance = user.balance - payment.amount;
                await axios.put(`http://user-service:3002/users/${payment.payerId}/balance`, {
                    balance: newBalance
                });

                // 8. Cập nhật trạng thái học phí
                await axios.put(`http://tuition-service:3005/tuitions/${payment.studentId}/status`, {
                    status: 'paid'
                });

                // 9. Cập nhật trạng thái payment
                await Payment.updateOne(
                    { paymentId },
                    { 
                        status: 'completed',
                        isProcessing: false,
                        processingBy: null
                    }
                );

                console.log('Payment completed successfully:', paymentId);
                // Gửi hóa đơn điện tử qua RabbitMQ
                await sendInvoiceToQueue({
                    transactionId: paymentId,
                    email: user.email,
                    payerName: user.fullName,
                    studentId: payment.studentId,
                    amount: payment.amount,
                    time: new Date().toLocaleString()
                });
            } catch (processError) {
                // Reset processing flag nếu có lỗi
                await Payment.updateOne(
                    { paymentId },
                    { 
                        isProcessing: false,
                        processingBy: null
                    }
                );
                throw processError;
            }

        } else {
            // Chỉ cập nhật status
            await Payment.updateOne(
                { paymentId },
                { status }
            );
        }

        const updatedPayment = await Payment.findOne({ paymentId });
        res.json(updatedPayment);

    } catch (error) {
        console.error('Lỗi cập nhật trạng thái giao dịch:', error);
        
        // Trả về lỗi cụ thể
        if (error.message === 'Tuition has been paid by another transaction') {
            return res.status(409).json({ message: 'Học phí đã được thanh toán bởi giao dịch khác' });
        }
        if (error.message === 'Insufficient balance') {
            return res.status(400).json({ message: 'Số dư không đủ để thực hiện giao dịch' });
        }
        
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Hàm gửi tin nhắn đến RabbitMQ
async function sendOtpToQueue(message) {
    try {
        const queue = 'otp_queue';
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672');
        const channel = await conn.createChannel();
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
        setTimeout(() => { conn.close(); }, 500);
        console.log('OTP message sent to queue:', message);
    } catch (error) {
        console.error('Error sending OTP to queue:', error);
        throw error;
    }
}

// Hàm gửi hóa đơn đến RabbitMQ
async function sendInvoiceToQueue(invoice) {
    try {
        const queue = 'invoice_queue';
        const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672');
        const channel = await conn.createChannel();
        await channel.assertQueue(queue, { durable: true });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(invoice)), { persistent: true });
        setTimeout(() => { conn.close(); }, 500);
        console.log('Invoice message sent to queue:', invoice);
    } catch (error) {
        console.error('Error sending invoice to queue:', error);
        throw error;
    }
}

// API lấy payment theo ID
app.get('/payments/:paymentId', async (req, res) => {
    try {
        const payment = await Payment.findOne({ paymentId: req.params.paymentId });
        if (!payment) return res.status(404).json({ message: 'Không tìm thấy payment' });
        res.json(payment);
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

// API lấy payments theo payer
app.get('/payments/payer/:payerId', async (req, res) => {
    try {
        const { payerId } = req.params;
        const payments = await Payment.find({ payerId }).sort({ createdAt: -1 });
        res.json(payments);
    } catch (error) {
        console.error('Error fetching payments by payer:', error);
        res.status(500).json({ message: 'Lỗi server' });
    }
});

app.listen(process.env.PORT || 3003, () => {
    console.log(`Payment Service running on port ${process.env.PORT || 3003}`);
});