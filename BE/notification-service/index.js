require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const amqp = require('amqplib');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const crypto = require('crypto');
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
}).then(async () => {
    console.log('✅ MongoDB connected');
    // Khởi động services sau khi MongoDB đã connect
    await startServices();
}).catch(err => {
    console.log('❌ MongoDB connection error:', err);
    process.exit(1);
});

// Schema cho notifications
const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
  userId: { type: String },
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

// RabbitMQ connection
let rabbitConnection;
let rabbitChannel;

// Leader election variables
let isLeader = false;
let leadershipInterval;
let emailMonitoringInterval;
let currentLeaderId = process.env.HOSTNAME || `notification-${process.pid}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Email monitoring variables
let isChecking = false;
let imap = null;

// Kết nối RabbitMQ
async function connectRabbitMQ(retryCount = 0) {
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
    
    console.log('✅ Connected to RabbitMQ');
  } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error);
      if (retryCount < 20) {
        setTimeout(() => connectRabbitMQ(retryCount + 1), 5000);
      } else {
        console.error('RabbitMQ connection failed after multiple retries.');
      }
    }
}

// Function để clear expired leaders
async function clearExpiredLeaders() {
  try {
    const now = new Date();
    const result = await mongoose.connection.db.collection('leader_election').deleteMany({
      service: 'email_monitoring',
      ttl: { $lt: now }
    });
    
    if (result.deletedCount > 0) {
      console.log(` [${currentLeaderId}] Cleared ${result.deletedCount} expired leader records`);
    }
  } catch (error) {
    console.error('Error clearing expired leaders:', error);
  }
}

// Leader election với logic chặt chẽ hơn
async function electLeader() {
  try {
    const now = new Date();
    const ttl = new Date(now.getTime() + 30000); // TTL 30 giây
    
    // Bước 1: Kiểm tra xem có leader hiện tại không
    const currentLeaderDoc = await mongoose.connection.db.collection('leader_election').findOne({
      service: 'email_monitoring'
    });
    
    const wasLeader = isLeader;
    
    // Bước 2: Nếu có leader và chưa expire, check xem có phải tôi không
    if (currentLeaderDoc && currentLeaderDoc.ttl > now) {
      if (currentLeaderDoc.leaderId === currentLeaderId) {
        // Tôi là leader hiện tại, gia hạn
        try {
          const result = await mongoose.connection.db.collection('leader_election').findOneAndUpdate(
            {
              service: 'email_monitoring',
              leaderId: currentLeaderId
            },
            {
              $set: {
                lastHeartbeat: now,
                ttl: ttl
              }
            },
            { returnDocument: 'after' }
          );
          
          isLeader = !!result.value;
          if (isLeader) {
            console.log(`✅ [${currentLeaderId}] Maintaining leadership`);
          }
        } catch (error) {
          console.error('Error maintaining leadership:', error);
          isLeader = false;
        }
      } else {
        // Có leader khác và còn valid
        isLeader = false;
        if (wasLeader) {
          console.log(`🟡 [${currentLeaderId}] Lost leadership to ${currentLeaderDoc.leaderId}`);
          stopEmailMonitoring();
        }
      }
      return;
    }
    
    // Bước 3: Không có leader hoặc leader đã expire, cố gắng trở thành leader
    try {
      const result = await mongoose.connection.db.collection('leader_election').findOneAndUpdate(
        {
          service: 'email_monitoring',
          $or: [
            { ttl: { $lt: now } }, // Leader cũ đã expire
            { leaderId: { $exists: false } }, // Chưa có leader
            { leaderId: null } // Leader null
          ]
        },
        {
          $set: {
            service: 'email_monitoring',
            leaderId: currentLeaderId,
            lastHeartbeat: now,
            ttl: ttl
          }
        },
        {
          upsert: true,
          returnDocument: 'after'
        }
      );
      
      // Kiểm tra kết quả có thật sự thành công không
      if (result.value && result.value.leaderId === currentLeaderId) {
        isLeader = true;
        if (!wasLeader) {
          console.log(` [${currentLeaderId}] Became email monitoring leader`);
          startEmailMonitoring();
        }
      } else {
        // Có container khác đã trở thành leader trước
        isLeader = false;
        if (wasLeader) {
          console.log(`🟡 [${currentLeaderId}] Lost leadership race`);
          stopEmailMonitoring();
        }
      }
      
    } catch (updateError) {
      // Nếu có lỗi (có thể do race condition), không được làm leader
      isLeader = false;
      if (wasLeader) {
        console.log(` [${currentLeaderId}] Lost leadership due to update error`);
        stopEmailMonitoring();
      }
    }
    
  } catch (error) {
    console.error('Leader election error:', error);
    if (isLeader) {
      console.log(` [${currentLeaderId}] Lost leadership due to error`);
      isLeader = false;
      stopEmailMonitoring();
    }
  }
}

// Khởi động leader election
async function startLeaderElection() {
  try {
    // Tạo TTL index cho leader election collection
    await mongoose.connection.db.collection('leader_election').createIndex(
      { "ttl": 1 }, 
      { expireAfterSeconds: 0 }
    );
    
    console.log(` [${currentLeaderId}] Starting leader election...`);
    
    // Clear expired leaders trước khi bắt đầu
    await clearExpiredLeaders();
    
    // Random delay để tránh race condition
    const randomDelay = Math.random() * 3000; // 0-3 giây
    console.log(` [${currentLeaderId}] Waiting ${Math.round(randomDelay)}ms before election...`);
    await new Promise(resolve => setTimeout(resolve, randomDelay));
    
    // Election sau delay
    await electLeader();
    
    // Heartbeat mỗi 15 giây + cleanup expired leaders
    leadershipInterval = setInterval(async () => {
      await clearExpiredLeaders(); // Cleanup trước
      await electLeader(); // Sau đó election
    }, 15000);
    
  } catch (error) {
    console.error('Error starting leader election:', error);
  }
}

// Dừng leader election
function stopLeaderElection() {
  if (leadershipInterval) {
    clearInterval(leadershipInterval);
    leadershipInterval = null;
  }
  isLeader = false;
  stopEmailMonitoring();
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
    
    const deliveryDate = new Date(Date.now() + 24*60*60*1000).toLocaleDateString('vi-VN');
    
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
      to: 'phannguyenquocthang311205@gmail.com',
      subject: `Yêu cầu đặt hàng ${order.orderCode} - ABC Inventory`,
      html: htmlContent
    };
    
    await emailTransporter.sendMail(mailOptions);
    console.log(` Email sent successfully for order ${order.orderCode}`);
    
    // Tạo notification thành công
    await createNotification({
      title: 'Gửi yêu cầu đặt hàng thành công',
      message: `Đã gửi yêu cầu đặt hàng ${order.orderCode} đến nhà cung cấp ${supplier}`,
      type: 'success',
      relatedOrderId: order.orderCode,
      metadata: { orderCode: order.orderCode, supplier }
    });
    
  } catch (error) {
    console.error(' Error sending email:', error);
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
    console.log(' Notification created:', data.title);
  } catch (error) {
    console.error(' Error creating notification:', error);
  }
}

// Cleanup IMAP connection
function cleanupImap() {
  if (imap) {
    try {
      imap.removeAllListeners();
      if (imap.state !== 'disconnected') {
        imap.end();
      }
    } catch (error) {
      console.error('Error during IMAP cleanup:', error);
    } finally {
      imap = null;
    }
  }
}

// Check emails function
function checkEmails() {
  // Kiểm tra leadership trước khi xử lý
  if (!isLeader) {
    console.log(' Not leader, skipping email check');
    return;
  }

  if (isChecking) {
    console.log(' Already checking emails, skipping...');
    return;
  }
  
  isChecking = true;
  cleanupImap();
  
  imap = new Imap(imapConfig);
  imap.setMaxListeners(20);
  
  function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
  }
  
  imap.once('ready', function() {
    console.log(' IMAP connection ready');
    
    openInbox(function(err, box) {
      if (err) {
        console.error(' Error opening inbox:', err);
        cleanupImap();
        isChecking = false;
        return;
      }
      
      // Kiểm tra leadership một lần nữa
      if (!isLeader) {
        console.log(' Lost leadership during email check');
        cleanupImap();
        isChecking = false;
        return;
      }
      
      // Tìm email mới trong 5 phút qua
      const since = new Date();
      since.setMinutes(since.getMinutes() - 5);
      
      imap.search([
        'UNSEEN', 
        ['SINCE', since],
        ['FROM', 'phannguyenquocthang311205@gmail.com']
      ], function(err, results) {
        if (err) {
          console.error(' Search error:', err);
          cleanupImap();
          isChecking = false;
          return;
        }
        
        if (!results || results.length === 0) {
          console.log(' No new emails found');
          cleanupImap();
          isChecking = false;
          return;
        }
        
        console.log(` Found ${results.length} new emails from supplier`);
        
        const f = imap.fetch(results, { 
          bodies: '',
          markSeen: true
        });
        
        let processed = 0;
        
        f.on('message', function(msg, seqno) {
          msg.on('body', function(stream, info) {
            simpleParser(stream, async (err, parsed) => {
              if (err) {
                console.error(' Parse error:', err);
                return;
              }

              try {
                // Tạo hash từ nội dung email để identify unique content
                const emailContent = `${parsed.subject || ''} ${parsed.text || ''}`.trim();
                const contentHash = crypto.createHash('md5').update(emailContent).digest('hex');
                
                // Kiểm tra duplicate dựa trên HASH của nội dung thay vì subject
                const existingNotification = await Notification.findOne({
                  'metadata.contentHash': contentHash,
                  'metadata.from': parsed.from.text,
                  createdAt: { $gte: since }
                });
                
                if (!existingNotification) {
                  // Extract order code
                  const extractOrderCode = (subject, text) => {
                    const pattern = /NH\d{13,}/;
                    const match = (subject || '').match(pattern) || (text || '').match(pattern);
                    return match ? match[0] : null;
                  };

                  const orderCode = extractOrderCode(parsed.subject, parsed.text);
                  
                  await createNotification({
                    title: 'Phản hồi từ nhà cung cấp',
                    message: `Nhà cung cấp đã phản hồi: ${parsed.subject}`,
                    type: 'info',
                    relatedOrderId: orderCode,
                    metadata: { 
                      subject: parsed.subject,
                      from: parsed.from.text,
                      snippet: parsed.text ? parsed.text.substring(0, 100) + '...' : '',
                      emailId: `${parsed.messageId || seqno}_${Date.now()}`,
                      orderCode: orderCode,
                      supplierEmail: true,
                      contentHash: contentHash, // Lưu hash để check duplicate
                      receivedAt: new Date().toISOString() // Timestamp khi nhận
                    }
                  });
                  
                  console.log(` New notification created for email: ${parsed.subject}, OrderCode: ${orderCode}`);
                } else {
                  console.log(' Duplicate email content skipped:', parsed.subject);
                }
              } catch (error) {
                console.error(' Error processing email:', error);
              }
              
              processed++;
            });
          });
          
          msg.once('end', function() {
            console.log(` Processed email ${processed}/${results.length}`);
          });
        });
        
        f.once('error', function(err) {
          console.error(' Fetch error:', err);
          cleanupImap();
          isChecking = false;
        });
        
        f.once('end', function() {
          console.log('Finished processing all emails');
          cleanupImap();
          isChecking = false;
        });
      });
    });
  });
  
  imap.once('error', function(err) {
    console.error(' IMAP error:', err);
    cleanupImap();
    isChecking = false;
  });
  
  imap.once('end', function() {
    console.log(' IMAP connection ended');
    isChecking = false;
  });
  
  try {
    imap.connect();
  } catch (error) {
    console.error(' IMAP connect error:', error);
    cleanupImap();
    isChecking = false;
  }
}

// Start email monitoring (chỉ khi là leader)
function startEmailMonitoring() {
  if (!isLeader) {
    console.log(' Not leader, cannot start email monitoring');
    return;
  }
  
  console.log(` [${currentLeaderId}] Starting email monitoring as leader...`);
  
  // Check ngay lập tức
  checkEmails();
  
  // Sau đó check mỗi 30 giây
  emailMonitoringInterval = setInterval(() => {
    if (isLeader) {
      checkEmails();
    }
  }, 30000);
}

// Stop email monitoring
function stopEmailMonitoring() {
  if (emailMonitoringInterval) {
    console.log(` [${currentLeaderId}] Stopping email monitoring...`);
    clearInterval(emailMonitoringInterval);
    emailMonitoringInterval = null;
  }
  cleanupImap();
  isChecking = false;
}

// API endpoints
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

app.put('/notifications/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Đã đánh dấu đọc' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
});

app.put('/notifications/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật thông báo' });
  }
});

app.post('/notifications/create', async (req, res) => {
  try {
    await createNotification(req.body);
    res.json({ message: 'Notification created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notification' });
  }
});

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    leaderId: currentLeaderId,
    isLeader: isLeader,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(' Received SIGINT, cleaning up...');
  stopEmailMonitoring();
  stopLeaderElection();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(' Received SIGTERM, cleaning up...');
  stopEmailMonitoring();
  stopLeaderElection();
  process.exit(0);
});

// Khởi tạo services
async function startServices() {
  try {
    await connectRabbitMQ();
    
    // Tạo TTL index
    try {
      await mongoose.connection.db.collection('leader_election').createIndex(
        { "ttl": 1 }, 
        { expireAfterSeconds: 0 }
      );
    } catch (indexError) {
      console.log('TTL Index already exists:', indexError.message);
    }
    
    await startLeaderElection();
    
    const PORT = process.env.PORT || 3004;
    app.listen(PORT, () => {
      console.log(` Notification service running on port ${PORT}`);
      console.log(` Instance ID: ${currentLeaderId}`);
    });
  } catch (error) {
    console.error(' Error starting services:', error);
    process.exit(1);
  }
}