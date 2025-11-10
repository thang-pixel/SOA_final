require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const amqp = require('amqplib');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

connectMongoWithRetry(process.env.MONGO_URI || 'mongodb://mongo:27017/notification-db');

const otpSchema = new mongoose.Schema({
  transactionId: { type: String, required: true },
  email: { type: String, required: true },
  otp: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const OTP = mongoose.model('OTP', otpSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Kết nối RabbitMQ với cơ chế retry
async function connectRabbitMQWithRetry(url, maxRetries = 10, delay = 5000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const conn = await amqp.connect(url);
      return conn;
    } catch (err) {
      console.error(`RabbitMQ connection failed (${retries + 1}/${maxRetries}):`, err.message);
      retries++;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to RabbitMQ after multiple attempts');
}


async function connectMongoWithRetry(uri, maxRetries = 10, delay = 5000) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      await mongoose.connect(uri);
      console.log('MongoDB connected for Notification Service');
      return;
    } catch (err) {
      console.error(`MongoDB connection failed (${retries + 1}/${maxRetries}):`, err.message);
      retries++;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Could not connect to MongoDB after multiple attempts');
}

// Tạo và gửi OTP
async function startOtpConsumer() {
  const queue = 'otp_queue';
  const conn = await connectRabbitMQWithRetry(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        const { transactionId, email } = JSON.parse(msg.content.toString());

        // Sinh OTP không trùng
        let otp;
        do {
          otp = generateOTP();
        } while (await OTP.findOne({ otp }));

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

        const otpRecord = new OTP({ transactionId, email, otp, expiresAt });
        await otpRecord.save();

        const mailOptions = {
          from: "Hệ thống TDTU iBanking",
          to: email,
          subject: 'Mã OTP của bạn',
          text: `Mã OTP của bạn là ${otp}. Nó sẽ có hiệu lực trong vòng 1 phút.`
        };

        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email} for transaction ${transactionId}`);

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing OTP message:', error.message);
        // Không ack để có thể retry nếu cần
      }
    }
  });
}

startOtpConsumer();

// Hàm lắng nghe request gửi hóa đơn
async function startInvoiceConsumer() {
  const queue = 'invoice_queue';
  const conn = await connectRabbitMQWithRetry(process.env.RABBITMQ_URL || 'amqp://localhost');
  const channel = await conn.createChannel();
  await channel.assertQueue(queue, { durable: true });

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        const { transactionId, email, payerName, studentId, amount, time } = JSON.parse(msg.content.toString());

        const mailOptions = {
          from: "Hệ thống iBanking TDTU <noreply@tdtu.edu.vn>",
          to: email,
          subject: 'Hóa đơn điện tử thanh toán học phí',
          html: `
            <div style="font-family:Roboto,Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 2px 8px #e0e0e0;background:#f9f9f9;">
              <div style="background:#1565c0;padding:24px 0;border-radius:8px 8px 0 0;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:2rem;">TDTU iBanking</h1>
                <p style="color:#e3f2fd;font-size:1.1rem;margin:0;">Hóa đơn điện tử thanh toán học phí</p>
              </div>
              <div style="padding:32px;">
                <table style="width:100%;font-size:1.05rem;">
                  <tr>
                    <td><strong>Mã giao dịch:</strong></td>
                    <td style="color:#1565c0;font-weight:bold;">${transactionId}</td>
                  </tr>
                  <tr>
                    <td><strong>Người nộp tiền:</strong></td>
                    <td>${payerName}</td>
                  </tr>
                  <tr>
                    <td><strong>MSSV:</strong></td>
                    <td>${studentId}</td>
                  </tr>
                  <tr>
                    <td><strong>Số tiền đã thanh toán:</strong></td>
                    <td style="color:#d32f2f;font-weight:bold;">${amount.toLocaleString('vi-VN')} VNĐ</td>
                  </tr>
                  <tr>
                    <td><strong>Thời gian giao dịch:</strong></td>
                    <td>${time}</td>
                  </tr>
                </table>
                <div style="margin:32px 0 0 0;">
                  <p style="color:#388e3c;font-size:1.1rem;">
                    ✅ Giao dịch thanh toán học phí đã được thực hiện thành công.<br>
                    Cảm ơn bạn đã sử dụng dịch vụ iBanking của TDTU.
                  </p>
                </div>
              </div>
              <div style="background:#e3f2fd;padding:16px;text-align:center;border-radius:0 0 8px 8px;">
                <small style="color:#1565c0;">Mọi thắc mắc vui lòng liên hệ phòng tài vụ TDTU hoặc email: support@tdtu.edu.vn</small>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Invoice sent to ${email} for transaction ${transactionId}`);

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing invoice message:', error.message);
        // Không ack để có thể retry nếu cần
      }
    }
  });
}

startInvoiceConsumer();

// API gửi lại OTP cho payment đã tồn tại
app.post('/otp/resend', async (req, res) => {
  try {
    const { transactionId, email } = req.body;
    if (!transactionId || !email) {
      return res.status(400).json({ message: 'Missing transactionId or email' });
    }

    // Xóa OTP cũ (nếu có)
    await OTP.deleteMany({ transactionId });

    // Sinh OTP mới
    let otp;
    do {
      otp = generateOTP();
    } while (await OTP.findOne({ otp }));

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    const otpRecord = new OTP({ transactionId, email, otp, expiresAt });
    await otpRecord.save();

    const mailOptions = {
      from: "Hệ thống TDTU iBanking",
      to: email,
      subject: 'Mã OTP mới',
      text: `Mã OTP mới của bạn là ${otp}. Nó sẽ có hiệu lực trong vòng 1 phút.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`New OTP sent to ${email} for transaction ${transactionId}`);

    res.json({ message: 'Mã OTP mới được gửi thành công' });
  } catch (error) {
    console.error('Error resending OTP:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


// Xác thực OTP
app.post('/otp/verify', async (req, res) => {
  try {
    const { transactionId, otp } = req.body;
    if (!transactionId || !otp) {
      return res.status(400).json({ message: 'Missing transactionId or otp' });
    }

    const otpRecord = await OTP.findOne({
      transactionId,
      otp,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lấy tất cả OTP theo transactionId 
app.get('/notifications/otp/:transactionId', async (req, res) => {
  try {
    const otpRecords = await OTP.find({ transactionId: req.params.transactionId })
      .sort({ createdAt: -1 });
    if (!otpRecords.length) {
      return res.status(404).json({ message: 'No OTP records found' });
    }
    res.json(otpRecords);
  } catch (error) {
    console.error('Error fetching OTP records:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));