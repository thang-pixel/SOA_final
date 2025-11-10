require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // React frontend (sửa port)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Proxy cho auth-service
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '',   // xoá "/api/auth"
  },
  logLevel: 'debug'
}));

// Proxy cho student-service
app.use('/api/students', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL || 'http://user-service:3002',
  changeOrigin: true,
  logLevel: 'debug',
  pathRewrite: {
    '^/api/students': '',   
  },
}));

// Proxy cho payment-service
app.use('/api/transaction', createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003',
  changeOrigin: true,
  pathRewrite: {
    '^/api/transaction': '', 
  },
  logLevel: 'debug'
}));

// Proxy cho notification-service
app.use('/api/notifications', createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3004',
  changeOrigin: true,
  pathRewrite: {
    '^/api/notifications': '',
  },
  logLevel: 'debug'
}));

// Proxy cho tuition-service
app.use('/api/tuitions', createProxyMiddleware({
  target: process.env.TUITION_SERVICE_URL || 'http://tuition-service:3005',
  changeOrigin: true,
  pathRewrite: {
    '^/api/tuitions': '',
  },
  logLevel: 'debug'
}));

// Route mặc định
app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running' });
});

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => console.log(` API Gateway running on port ${PORT}`));
