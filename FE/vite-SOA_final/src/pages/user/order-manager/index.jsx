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
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Warehouse as WarehouseIcon,
  Business as BusinessIcon,
  Timer as TimerIcon,
  FilterList as FilterIcon,
  ViewModule as ViewModuleIcon,
  TableRows as TableRowsIcon,
  Visibility as VisibilityIcon
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

// Dialog chi tiết đơn hàng
const OrderDetailDialog = React.memo(({ open, onClose, order }) => {
  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <VisibilityIcon color="primary" />
          <Typography variant="h6">
            Chi tiết đơn hàng - {order.orderCode}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Nhà cung cấp:</Typography>
            <Typography variant="body1">{order.supplier}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Trạng thái:</Typography>
            <OrderStatusChip status={order.status} />
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Tổng tiền:</Typography>
            <Typography variant="body1" fontWeight={600}>
              {order.totalAmount.toLocaleString('vi-VN')}đ
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">Tạo bởi:</Typography>
            <Typography variant="body1">{order.createdBy}</Typography>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom>Danh sách sản phẩm</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>STT</TableCell>
                <TableCell>Mã hàng</TableCell>
                <TableCell>Tên sản phẩm</TableCell>
                <TableCell align="center">Số lượng</TableCell>
                <TableCell align="center">Đơn giá</TableCell>
                <TableCell align="center">Thành tiền</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item, index) => (
                <TableRow key={item.productId}>
                  <TableCell>{index + 1}</TableCell>
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
                    {item.unitPrice.toLocaleString('vi-VN')}đ
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600} color="success.main">
                      {item.totalPrice.toLocaleString('vi-VN')}đ
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
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
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // State cho filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  
  // State cho view mode
  const [viewMode, setViewMode] = useState('cards'); // 'cards' hoặc 'table'

  useEffect(() => {
    dispatch(fetchImportOrders());
  }, [dispatch]);

  // Lọc đơn hàng theo trạng thái và nhà cung cấp
  const filteredOrders = useMemo(() => {
    return importOrders.filter(order => {
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchSupplier = !supplierFilter || 
        order.supplier.toLowerCase().includes(supplierFilter.toLowerCase());
      
      return matchStatus && matchSupplier;
    });
  }, [importOrders, statusFilter, supplierFilter]);

  // Thống kê theo trạng thái
  const statusStats = useMemo(() => {
    const stats = {
      all: importOrders.length,
      draft: 0,
      processing: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };

    importOrders.forEach(order => {
      stats[order.status] = (stats[order.status] || 0) + 1;
    });

    return stats;
  }, [importOrders]);

  // Lấy danh sách nhà cung cấp unique
  const suppliers = useMemo(() => {
    const uniqueSuppliers = [...new Set(importOrders.map(order => order.supplier))];
    return uniqueSuppliers.sort();
  }, [importOrders]);

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
    dispatch(fetchImportOrders());
  }, [dispatch]);

  const handleViewDetail = useCallback((order) => {
    setSelectedOrder(order);
    setShowDetailDialog(true);
  }, []);

  const handleCloseDetailDialog = useCallback(() => {
    setShowDetailDialog(false);
    setSelectedOrder(null);
  }, []);

  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  const handleSupplierFilterChange = useCallback((event) => {
    setSupplierFilter(event.target.value);
  }, []);

  const handleViewModeChange = useCallback((event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN');
  }, []);

  // Render DataGrid view
  const renderTableView = useCallback(() => (
    <Paper sx={{ mb: 3 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Mã đơn hàng</TableCell>
              <TableCell>Nhà cung cấp</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Tổng tiền</TableCell>
              <TableCell align="center">Số SP</TableCell>
              <TableCell>Thời gian tạo</TableCell>
              <TableCell align="center">Đặc biệt</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow key={order._id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} color="primary">
                    {order.orderCode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {order.supplier}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <OrderStatusChip status={order.status} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>
                    {order.totalAmount.toLocaleString('vi-VN')}đ
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={order.items.length} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(order.createdAt)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                    {order.status === 'processing' && order.processedAt && (
                      <CountdownTimer 
                        targetTime={order.processedAt}
                        onComplete={handleRefresh}
                      />
                    )}
                    {order.status === 'delivered' && (
                      <Alert severity="info" sx={{ py: 0, px: 1 }}>
                        <Typography variant="caption">Có thể nhập kho</Typography>
                      </Alert>
                    )}
                    {order.status === 'completed' && (
                      <Alert severity="success" sx={{ py: 0, px: 1 }}>
                        <Typography variant="caption">
                          {order.warehouseReceiptCode}
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box display="flex" gap={1}>
                    <Tooltip title="Xem chi tiết">
                      <IconButton 
                        size="small" 
                        onClick={() => handleViewDetail(order)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {order.status === 'delivered' && (
                      <Tooltip title="Tạo phiếu nhập kho">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCreateWarehouseReceipt(order)}
                        >
                          <WarehouseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  ), [filteredOrders, formatDate, handleRefresh, handleViewDetail, handleCreateWarehouseReceipt]);

  // Render Cards view
  const renderCardsView = useCallback(() => (
    <Grid container spacing={3}>
      {filteredOrders.map((order) => (
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
              <Button
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={() => handleViewDetail(order)}
                sx={{ textTransform: 'none' }}
              >
                Chi tiết
              </Button>
              {order.status === 'delivered' && (
                <Button
                  variant="contained"
                  size="small"
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
  ), [filteredOrders, formatDate, handleRefresh, handleViewDetail, handleCreateWarehouseReceipt]);

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
        
        <Box display="flex" alignItems="center" gap={2}>
          {/* View Mode Toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Hiển thị dạng thẻ">
                <ViewModuleIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <Tooltip title="Hiển thị dạng bảng">
                <TableRowsIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ textTransform: 'none' }}
          >
            Làm mới
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600}>{statusStats.all}</Typography>
            <Typography variant="caption" color="text.secondary">Tổng đơn</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="warning.main">{statusStats.processing}</Typography>
            <Typography variant="caption" color="text.secondary">Đang xử lý</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="info.main">{statusStats.delivered}</Typography>
            <Typography variant="caption" color="text.secondary">Đã giao</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="success.main">{statusStats.completed}</Typography>
            <Typography variant="caption" color="text.secondary">Hoàn thành</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="default">{statusStats.draft}</Typography>
            <Typography variant="caption" color="text.secondary">Nháp</Typography>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="error.main">{statusStats.cancelled}</Typography>
            <Typography variant="caption" color="text.secondary">Đã hủy</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterIcon color="action" />
          <Typography variant="h6" fontWeight={600}>
            Bộ lọc
          </Typography>
        </Box>
        
        <Grid container spacing={2} alignItems="center" wrap="wrap">
          <Grid item sx={{ width: 240 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái đơn hàng</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Trạng thái đơn hàng"
              >
                <MenuItem value="all">Tất cả ({statusStats.all})</MenuItem>
                <MenuItem value="draft">Nháp ({statusStats.draft})</MenuItem>
                <MenuItem value="processing">Đang xử lý ({statusStats.processing})</MenuItem>
                <MenuItem value="delivered">Đã giao ({statusStats.delivered})</MenuItem>
                <MenuItem value="completed">Hoàn thành ({statusStats.completed})</MenuItem>
                <MenuItem value="cancelled">Đã hủy ({statusStats.cancelled})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item sx={{ width: 220 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Nhà cung cấp</InputLabel>
              <Select
                value={supplierFilter}
                onChange={handleSupplierFilterChange}
                label="Nhà cung cấp"
              >
                <MenuItem value="">Tất cả</MenuItem>
                {suppliers.map((supplier) => (
                  <MenuItem key={supplier} value={supplier}>
                    {supplier}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item sx={{ width: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Hiển thị: <strong>{filteredOrders.length}</strong> đơn hàng
            </Typography>
          </Grid>
          
          <Grid item sx={{ width: 120 }}>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={() => {
                setStatusFilter('all');
                setSupplierFilter('');
              }}
            >
              Xóa bộ lọc
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Thông báo khi không có dữ liệu */}
      {filteredOrders.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Không tìm thấy đơn hàng
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thử thay đổi bộ lọc hoặc tạo đơn hàng mới
          </Typography>
        </Paper>
      )}

      {/* Danh sách đơn hàng theo view mode */}
      {viewMode === 'table' ? renderTableView() : renderCardsView()}

      {/* Dialog chi tiết đơn hàng */}
      <OrderDetailDialog
        open={showDetailDialog}
        onClose={handleCloseDetailDialog}
        order={selectedOrder}
      />

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