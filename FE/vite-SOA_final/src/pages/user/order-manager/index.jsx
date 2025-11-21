import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Warehouse as WarehouseIcon,
  Business as BusinessIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import {
  fetchImportOrders,
  createWarehouseReceipt,
  completeWarehouseReceipt
} from '../../../redux/action/orderAction';
import {
  updateWarehouseReceiptItem,
  setWarehouseStaff,
  clearWarehouseReceipt
} from '../../../redux/reducers/orderSlice';

// Component hiển thị trạng thái đơn hàng
const OrderStatusChip = React.memo(({ status }) => {
  const statusConfig = {
    draft: { label: 'Nháp', color: 'default' },
    processing: { label: 'Đang xử lý', color: 'warning' },
    delivered: { label: 'Đã giao', color: 'info' },
    completed: { label: 'Hoàn thành', color: 'success' },
    cancelled: { label: 'Đã hủy', color: 'error' }
  };

  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <Chip 
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
    />
  );
});

// Component đếm ngược thời gian
const CountdownTimer = React.memo(({ targetTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const target = new Date(targetTime).getTime();
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const difference = target + 30000 - now; // 30 giây sau thời gian xử lý
      
      if (difference > 0) {
        setTimeLeft(Math.ceil(difference / 1000));
      } else {
        setTimeLeft(0);
        onComplete?.();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onComplete]);

  if (timeLeft <= 0) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <TimerIcon fontSize="small" color="warning" />
      <Typography variant="caption" color="warning.main">
        Còn {timeLeft}s
      </Typography>
    </Box>
  );
});

// Dialog tạo phiếu nhập kho
const WarehouseReceiptDialog = React.memo(({ open, onClose, order }) => {
  const dispatch = useDispatch();
  const { warehouseReceipt } = useSelector(state => state.order);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    if (open && order) {
      dispatch(createWarehouseReceipt(order));
      dispatch(setWarehouseStaff(user?.fullName || user?.username || ''));
    }
  }, [open, order, dispatch, user]);

  const handleActualQuantityChange = useCallback((index, value) => {
    dispatch(updateWarehouseReceiptItem({ 
      index, 
      actualQuantity: Math.max(0, parseInt(value) || 0) 
    }));
  }, [dispatch]);

  const handleStaffChange = useCallback((e) => {
    dispatch(setWarehouseStaff(e.target.value));
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    try {
      if (!warehouseReceipt.warehouseStaff.trim()) {
        alert('Vui lòng nhập tên nhân viên kho');
        return;
      }

      const actualQuantities = warehouseReceipt.items.map(item => ({
        productId: item.productId,
        actualQuantity: item.actualQuantity
      }));

      await dispatch(completeWarehouseReceipt(
        warehouseReceipt.orderId,
        actualQuantities,
        warehouseReceipt.warehouseStaff
      ));

      alert('Tạo phiếu nhập kho thành công! Tồn kho đã được cập nhật.');
      onClose();
    } catch (error) {
      alert('Lỗi khi tạo phiếu nhập kho: ' + error.message);
    }
  }, [warehouseReceipt, dispatch, onClose]);

  const handleClose = useCallback(() => {
    dispatch(clearWarehouseReceipt());
    onClose();
  }, [dispatch, onClose]);

  const totalActual = useMemo(() => {
    return warehouseReceipt.items.reduce((sum, item) => sum + (item.actualQuantity || 0), 0);
  }, [warehouseReceipt.items]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <WarehouseIcon color="primary" />
          <Typography variant="h6">
            Tạo phiếu nhập kho - {order?.orderCode}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Box mb={3}>
          <TextField
            fullWidth
            label="Nhân viên kho"
            value={warehouseReceipt.warehouseStaff}
            onChange={handleStaffChange}
            size="small"
            required
            placeholder="Nhập tên nhân viên thực hiện kiểm tra"
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã hàng</TableCell>
                <TableCell>Tên sản phẩm</TableCell>
                <TableCell align="center">SL đặt hàng</TableCell>
                <TableCell align="center">SL thực nhận</TableCell>
                <TableCell align="center">Chênh lệch</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouseReceipt.items.map((item, index) => (
                <TableRow key={item.productId}>
                  <TableCell>
                    <Typography color="primary" fontWeight={500}>
                      {item.productCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell align="center">
                    <Chip label={item.quantity} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <TextField
                      type="number"
                      value={item.actualQuantity || 0}
                      onChange={(e) => handleActualQuantityChange(index, e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: 'center' } }}
                      size="small"
                      sx={{ width: 80 }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {(() => {
                      const diff = (item.actualQuantity || 0) - item.quantity;
                      return (
                        <Typography 
                          color={diff === 0 ? 'text.secondary' : diff > 0 ? 'success.main' : 'error.main'}
                          fontWeight={diff !== 0 ? 600 : 400}
                        >
                          {diff > 0 ? '+' : ''}{diff}
                        </Typography>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Tổng số lượng thực nhận:
          </Typography>
          <Chip label={totalActual} color="primary" />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={warehouseReceipt.isCreating}
        >
          Tạo phiếu nhập kho
        </Button>
      </DialogActions>
    </Dialog>
  );
});

function OrderManager() {
  const dispatch = useDispatch();
  const { importOrders, loading, error } = useSelector(state => state.order);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);

  useEffect(() => {
    dispatch(fetchImportOrders());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchImportOrders());
  }, [dispatch]);

  const handleCreateWarehouseReceipt = useCallback((order) => {
    setSelectedOrder(order);
    setShowWarehouseDialog(true);
  }, []);

  const handleCloseWarehouseDialog = useCallback(() => {
    setShowWarehouseDialog(false);
    setSelectedOrder(null);
    // Refresh danh sách sau khi tạo phiếu
    dispatch(fetchImportOrders());
  }, [dispatch]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN');
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        Loading...
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <AssignmentIcon sx={{ mr: 1, fontSize: 32 }} color="primary" />
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Quản lý đơn nhập hàng
          </Typography>
        </Box>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          sx={{ textTransform: 'none' }}
        >
          Làm mới
        </Button>
      </Box>

      {/* Danh sách đơn hàng */}
      <Grid container spacing={3}>
        {importOrders.map((order) => (
          <Grid item xs={12} md={6} lg={4} key={order._id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight={600}>
                    {order.orderCode}
                  </Typography>
                  <OrderStatusChip status={order.status} />
                </Box>
                
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {order.supplier}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Tổng tiền: <strong>{order.totalAmount.toLocaleString('vi-VN')}đ</strong>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Số sản phẩm: <strong>{order.items.length}</strong>
                </Typography>
                
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Tạo: {formatDate(order.createdAt)}
                </Typography>

                {order.status === 'processing' && order.processedAt && (
                  <CountdownTimer 
                    targetTime={order.processedAt}
                    onComplete={handleRefresh}
                  />
                )}

                {order.status === 'delivered' && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Hàng đã được giao. Có thể tạo phiếu nhập kho.
                  </Alert>
                )}

                {order.status === 'completed' && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Đã hoàn thành. Mã phiếu: {order.warehouseReceiptCode}
                  </Alert>
                )}
              </CardContent>
              
              <CardActions>
                {order.status === 'delivered' && (
                  <Button
                    variant="contained"
                    startIcon={<WarehouseIcon />}
                    onClick={() => handleCreateWarehouseReceipt(order)}
                    sx={{ textTransform: 'none' }}
                  >
                    Tạo phiếu nhập kho
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog tạo phiếu nhập kho */}
      <WarehouseReceiptDialog
        open={showWarehouseDialog}
        onClose={handleCloseWarehouseDialog}
        order={selectedOrder}
      />
    </Box>
  );
}

export default OrderManager;