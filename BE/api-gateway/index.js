require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173', // React frontend (sửa port)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Proxy cho auth-service
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '',   // xoá "/api/auth"
  },
  logLevel: 'debug'
}));


// Route mặc định
app.get('/', (req, res) => {
  res.json({ message: 'API Gateway is running' });
});

//proxy cho inventory-service
app.use('/api/inventory', createProxyMiddleware({
  target: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/api/inventory': '',   // xoá "/api/inventory"
  },
  logLevel: 'debug'
}));

const PORT = process.env.PORT || 2000;
app.listen(PORT, () => console.log(` API Gateway running on port ${PORT}`));
