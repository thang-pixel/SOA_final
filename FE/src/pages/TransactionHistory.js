
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import Navbar from '../components/Navbar';

function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggedInUser, setLoggedInUser] = useState(null);

  useEffect(() => {
    fetchUserTransactions();
  }, []);

  const fetchUserTransactions = async () => {
    try {
      setLoading(true);
      
      // Lấy thông tin user từ token
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Không tìm thấy token đăng nhập');
        return;
      }

      const decoded = jwtDecode(token);
      if (!decoded.studentId) {
        setError('Token không hợp lệ');
        return;
      }

      // Lấy thông tin user
      const userRes = await axios.get(`http://localhost:2000/api/students/users/${decoded.studentId}`);
      setLoggedInUser(userRes.data);

      // Lấy lịch sử giao dịch của user này (payerId)
      const res = await axios.get(`http://localhost:2000/api/transaction/payments/payer/${decoded.studentId}`);
      const allPayments = res.data;
      
      // Sắp xếp theo thời gian mới nhất
      const sortedPayments = allPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setTransactions(sortedPayments);
    } catch (err) {
      console.error('Lỗi khi lấy lịch sử giao dịch:', err);
      setError('Không thể tải lịch sử giao dịch');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Hoàn thành';
      case 'pending':
        return 'Đang xử lý';
      case 'failed':
        return 'Thất bại';
      default:
        return 'Không xác định';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* Header */}
        
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
          borderRadius: 2
        }}
      >
        <Typography variant="h4" align="center" sx={{ mb: 2, fontWeight: 'bold', color: '#1565c0' }}>
          Lịch sử giao dịch
        </Typography>
        {loggedInUser && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#1976d2' }}>
              {loggedInUser.fullName} - {loggedInUser.studentId}
            </Typography>
            <Typography variant="body1" sx={{ color: '#1976d2' }}>
              Số dư hiện tại: <strong>{loggedInUser.balance?.toLocaleString('vi-VN')} VNĐ</strong>
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Transaction table */}
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Mã giao dịch</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>MSSV được thanh toán</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Số tiền</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Thời gian</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="textSecondary">
                    Chưa có giao dịch nào
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow 
                  key={transaction.paymentId}
                  sx={{ 
                    '&:hover': { backgroundColor: '#f9f9f9' },
                    '&:nth-of-type(even)': { backgroundColor: '#fafafa' }
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {transaction.paymentId.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {transaction.studentId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: transaction.status === 'completed' ? '#d32f2f' : '#1976d2'
                      }}
                    >
                      {transaction.amount?.toLocaleString('vi-VN')} VNĐ
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(transaction.status)}
                      color={getStatusColor(transaction.status)}
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(transaction.createdAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary */}
      {transactions.length > 0 && (
        <Paper elevation={2} sx={{ mt: 3, p: 2, backgroundColor: '#f8f9fa' }}>
          <Typography variant="body2" align="center" color="textSecondary">
            Tổng cộng: {transactions.length} giao dịch | 
            Hoàn thành: {transactions.filter(t => t.status === 'completed').length} | 
            Đang xử lý: {transactions.filter(t => t.status === 'pending').length}
          </Typography>
        </Paper>
      )}
    </Container>
    </>
  );
}

export default TransactionHistory;