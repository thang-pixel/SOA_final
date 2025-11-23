require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const amqp = require('amqplib');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
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

// Schema cho notifications
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  userId: { type: String }, // Có thể để trống cho notification chung
  isRead: { type: Boolean, default: false },
  relatedOrderId: { type: String },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Cấu hình email transporter
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Cấu hình IMAP để đọc email
const imapConfig = {
  user: process.env.EMAIL,
  password: process.env.EMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: {
    rejectUnauthorized: false
  }
};

let rabbitConnection;
let rabbitChannel;






// Kết nối RabbitMQ
async function connectRabbitMQ() {
  try {
    rabbitConnection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    rabbitChannel = await rabbitConnection.createChannel();
    
    // Tạo queue cho email
    await rabbitChannel.assertQueue('email_queue', { durable: true });
    await rabbitChannel.assertQueue('notification_queue', { durable: true });
    
    // Consumer cho email queue
    rabbitChannel.consume('email_queue', async (message) => {
      if (message) {
        try {
          const emailData = JSON.parse(message.content.toString());
          await sendOrderEmail(emailData);
          rabbitChannel.ack(message);
        } catch (error) {
          console.error('Error processing email queue:', error);
          rabbitChannel.nack(message, false, false);
        }
      }
    });
    
    // Consumer cho notification queue
    rabbitChannel.consume('notification_queue', async (message) => {
      if (message) {
        try {
          const notificationData = JSON.parse(message.content.toString());
          await createNotification(notificationData);
          rabbitChannel.ack(message);
        } catch (error) {
          console.error('Error processing notification queue:', error);
          rabbitChannel.nack(message, false, false);
        }
      }
    });
    
    console.log('Connected to RabbitMQ');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
  }
}

// Gửi email đến nhà cung cấp
async function sendOrderEmail(emailData) {
  try {
    const { order, supplier } = emailData;
    
    // Tạo bảng sản phẩm HTML
    const productRows = order.items.map(item => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.productCode}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.productName}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.unitPrice.toLocaleString('vi-VN')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.totalPrice.toLocaleString('vi-VN')}</td>
      </tr>
    `).join('');
    
    const currentDate = new Date().toLocaleDateString('vi-VN');
    const deliveryDate = new Date(Date.now() + 24*60*60*1000).toLocaleDateString('vi-VN'); // +1 ngày
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h2 style="color: #2563eb;">YÊU CẦU ĐẶT HÀNG - ${order.orderCode}</h2>
        
        <p>Dear <strong>${supplier}</strong>,</p>
        
        <p>Cửa hàng ABC xin gửi yêu cầu đặt hàng như sau:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Mã SP</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Tên sản phẩm</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Số lượng</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Đơn giá (VNĐ)</th>
              <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
            <tr style="background-color: #f9fafb; font-weight: bold;">
              <td colspan="4" style="border: 1px solid #ddd; padding: 12px; text-align: right;">TỔNG CỘNG:</td>
              <td style="border: 1px solid #ddd; padding: 12px; text-align: right; color: #dc2626;">
                ${order.totalAmount.toLocaleString('vi-VN')} VNĐ
              </td>
            </tr>
          </tbody>
        </table>
        
        <h3 style="color: #059669;">Thông tin giao hàng</h3>
        <ul>
          <li><strong>Địa chỉ:</strong> 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</li>
          <li><strong>Người nhận:</strong> Nguyễn Văn A – 0909 123 456</li>
          <li><strong>Thời gian mong muốn:</strong> Trước 17:00, ngày ${deliveryDate}</li>
        </ul>
        
        <h3 style="color: #dc2626;">Ghi chú</h3>
        <p>${order.notes || 'Vui lòng xác nhận lại hàng tồn, giá và thời gian giao dự kiến.'}</p>
        <p>Nếu có thay đổi vui lòng phản hồi qua email này.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        
        <p style="margin-bottom: 5px;"><strong>Trân trọng,</strong></p>
        <p style="margin-bottom: 5px;">Hệ thống quản lý kho – ABC Inventory System</p>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">(Email này được gửi tự động từ hệ thống)</p>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL,
      to: 'lunwatuanoi@gmail.com',
      subject: `Yêu cầu đặt hàng ${order.orderCode} - ABC Inventory`,
      html: htmlContent
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log(`Email sent successfully for order ${order.orderCode}`);
    
    // Tạo notification thành công
    await createNotification({
      title: 'Gửi yêu cầu đặt hàng thành công',
      message: `Đã gửi yêu cầu đặt hàng ${order.orderCode} đến nhà cung cấp ${supplier}`,
      type: 'success',
      relatedOrderId: order.orderCode,
      metadata: { orderCode: order.orderCode, supplier }
    });
    
  } catch (error) {
    console.error('Error sending email:', error);
    // Tạo notification lỗi
    await createNotification({
      title: 'Lỗi gửi email',
      message: `Không thể gửi email đến nhà cung cấp. Vui lòng thử lại.`,
      type: 'error',
      relatedOrderId: emailData.order.orderCode
    });
  }
}

// Tạo notification
async function createNotification(data) {
  try {
    const notification = new Notification(data);
    await notification.save();
    console.log('Notification created:', data.title);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// Check email định kỳ
function startEmailMonitoring() {
  const imap = new Imap(imapConfig);
  
  function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
  }
  
  function checkEmails() {
    imap.once('ready', function() {
      openInbox(function(err, box) {
        if (err) {
          console.error('Error opening inbox:', err);
          return;
        }
        
        // Tìm email mới trong 1 phút qua
        const since = new Date();
        since.setMinutes(since.getMinutes() - 1);
        
        imap.search(['UNSEEN', ['SINCE', since]], function(err, results) {
          if (err || !results || results.length === 0) {
            imap.end();
            return;
          }
          
          const f = imap.fetch(results, { bodies: '' });
          f.on('message', function(msg, seqno) {
            msg.on('body', function(stream, info) {
              simpleParser(stream, async (err, parsed) => {
                if (err) return;

                // Kiểm tra nếu email từ supplier
                if (parsed.from.text.includes('lunwatuanoi@gmail.com')) {
                  await createNotification({
                    title: 'Phản hồi từ nhà cung cấp',
                    message: `Nhà cung cấp đã phản hồi: ${parsed.subject}`,
                    type: 'info',
                    metadata: { 
                      subject: parsed.subject,
                      from: parsed.from.text,
                      snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : ''
                    }
                  });

                  // Đánh dấu email đã đọc để không bị lặp lại lần sau
                  imap.addFlags(seqno, '\\Seen', (err) => {
                    if (err) console.error('Error marking email as seen:', err);
                  });
                }
              });
            });
          });
          
          f.once('end', function() {
            imap.end();
          });
        });
      });
    });
    
    imap.once('error', function(err) {
      console.error('IMAP error:', err);
    });
    
    imap.connect();
  }
  
  // Check email mỗi 60 giây
  setInterval(checkEmails, 60000);
  console.log('Email monitoring started');
}

// API endpoints

// Lấy danh sách notifications
app.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = unreadOnly === 'true' ? { isRead: false } : {};
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ isRead: false });
    
    res.json({
      notifications,
      total,
      unreadCount,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách thông báo' });
  }
});

// Đánh dấu notification đã đọc
app.put('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Đã đánh dấu đọc' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
});

// Đánh dấu tất cả đã đọc
app.put('/notifications/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
});

// API để tạo notification từ external service
app.post('/notifications/create', async (req, res) => {
  try {
    await createNotification(req.body);
    res.json({ message: 'Notification created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification' });
  }
});

// API để gửi email qua queue
app.post('/send-order-email', async (req, res) => {
  try {
    const { order, supplier } = req.body;
    
    if (rabbitChannel) {
      rabbitChannel.sendToQueue('email_queue', 
        Buffer.from(JSON.stringify({ order, supplier })),
        { persistent: true }
      );
      res.json({ message: 'Email queued successfully' });
    } else {
      throw new Error('RabbitMQ not connected');
    }
  } catch (error) {
    console.error('Error queuing email:', error);
    res.status(500).json({ message: 'Error queuing email' });
  }
});

// Khởi tạo services
connectRabbitMQ();
startEmailMonitoring();

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
});