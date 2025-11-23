require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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

// Schema cho activity log
const activityLogSchema = new mongoose.Schema({
  username: { type: String, required: true },
  action: { 
    type: String, 
    required: true,
    enum: ['login', 'logout', 'create_product', 'update_product', 'delete_product', 
           'create_import_order', 'submit_import_order', 'create_warehouse_receipt',
           'create_export_order', 'approve_export_order', 'reject_export_order',
           'update_user', 'delete_user', 'register']
  },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Thông tin bổ sung (productId, orderId, etc.)
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// API tạo activity log
app.post('/activity/log', async (req, res) => {
  try {
    const { username, action, description, metadata, ipAddress, userAgent } = req.body;
    
    const newLog = new ActivityLog({
      username,
      action,
      description,
      metadata,
      ipAddress,
      userAgent
    });
    
    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error creating activity log:', error);
    res.status(500).json({ message: 'Lỗi tạo log hoạt động', error: error.message });
  }
});

// API lấy danh sách activity logs 
app.get('/activity/logs', async (req, res) => {
  try {
    const { 
      username, 
      action, 
      startDate, 
      endDate, 
      limit = 50, 
      page = 1 
    } = req.query;
    
    let query = {};
    
    if (username) query.username = username;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Lỗi lấy danh sách log hoạt động' });
  }
});

// API lấy thống kê hoạt động theo ngày
app.get('/activity/stats/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }
    
    const stats = await ActivityLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            action: "$action"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê hoạt động' });
  }
});

// API lấy thống kê hoạt động theo user
app.get('/activity/stats/by-user', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }
    
    const stats = await ActivityLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$username",
          totalActivities: { $sum: 1 },
          actions: { $push: "$action" }
        }
      },
      { $sort: { totalActivities: -1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê theo user' });
  }
});

// API lấy lịch sử nhập/xuất của một sản phẩm cụ thể
app.get('/activity/logs/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50 } = req.query;
    
    // Lấy các hoạt động liên quan đến sản phẩm này
    const logs = await ActivityLog.find({
      'metadata.productId': productId,
      action: { 
        $in: ['create_import_order', 'submit_import_order', 'create_warehouse_receipt', 
              'create_export_order', 'approve_export_order', 'update_product'] 
      }
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    // Thống kê tổng hợp
    const stats = {
      totalImports: logs.filter(log => log.action === 'create_warehouse_receipt').length,
      totalExports: logs.filter(log => log.action === 'approve_export_order').length,
      totalUpdates: logs.filter(log => log.action === 'update_product').length
    };
    
    res.json({
      logs,
      stats,
      productId
    });
  } catch (error) {
    console.error('Error fetching product activity logs:', error);
    res.status(500).json({ message: 'Lỗi lấy lịch sử sản phẩm', error: error.message });
  }
});

// API lấy thống kê tổng hợp cho dashboard
app.get('/activity/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: today } } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Tổng hoạt động hôm nay
    const totalToday = todayStats.reduce((sum, stat) => sum + stat.count, 0);
    
    // Số lượng đăng nhập hôm nay
    const loginToday = todayStats.find(s => s._id === 'login')?.count || 0;
    
    // Số lượng nhập hàng hôm nay (tạo phiếu nhập kho)
    const importsToday = todayStats.find(s => s._id === 'create_warehouse_receipt')?.count || 0;
    
    // Số lượng xuất hàng hôm nay (phê duyệt đơn xuất)
    const exportsToday = todayStats.find(s => s._id === 'approve_export_order')?.count || 0;
    
    // Hoạt động gần đây (10 hoạt động mới nhất)
    const recentActivities = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10)
      .select('username action description timestamp');
    
    res.json({
      totalToday,
      loginToday,
      importsToday,
      exportsToday,
      recentActivities,
      detailedStats: todayStats
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ message: 'Lỗi lấy thống kê tổng hợp' });
  }
});



const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`Activity service running on port ${PORT}`);
});
