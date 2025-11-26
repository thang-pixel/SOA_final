import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useLocation } from 'react-router-dom';
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
  Visibility as VisibilityIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import {
  fetchImportOrders,
  fetchExportOrders,
  createWarehouseReceipt,
  completeWarehouseReceipt
} from '../../../redux/action/orderAction';
import {
  updateWarehouseReceiptItem,
  setWarehouseStaff,
  clearWarehouseReceipt
} from '../../../redux/reducers/orderSlice';
import { useNotification } from '../../../hooks/useNotification';
import NotificationSnackbar from '../../../components/NotificationSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useConfirm } from '../../../hooks/useConfirm';

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

// Component hiển thị loại đơn hàng
const OrderTypeChip = React.memo(({ type }) => {
  return (
    <Chip
      label={type === 'import' ? 'Nhập hàng' : 'Xuất hàng'}
      color={type === 'import' ? 'primary' : 'success'}
      size="small"
      variant="filled"
      icon={type === 'import' ? <WarehouseIcon /> : <ReceiptIcon />}
    />
  );
});

// // Component đếm ngược thời gian
// const CountdownTimer = React.memo(({ targetTime, onComplete }) => {
//   const [timeLeft, setTimeLeft] = useState(0);

//   useEffect(() => {
//     const target = new Date(targetTime).getTime();
    
//     const timer = setInterval(() => {
//       const now = new Date().getTime();
//       const difference = target + 30000 - now; // 30 giây sau thời gian xử lý
      
//       if (difference > 0) {
//         setTimeLeft(Math.ceil(difference / 1000));
//       } else {
//         setTimeLeft(0);
//         onComplete?.();
//         clearInterval(timer);
//       }
//     }, 1000);

//     return () => clearInterval(timer);
//   }, [targetTime, onComplete]);

//   if (timeLeft <= 0) return null;

//   return (
//     <Box display="flex" alignItems="center" gap={1}>
//       <TimerIcon fontSize="small" color="warning" />
//       <Typography variant="caption" color="warning.main">
//         Còn {timeLeft}s
//       </Typography>
//     </Box>
//   );
// });

// Dialog chi tiết đơn hàng
const OrderDetailDialog = React.memo(({ open, onClose, order }) => {
  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <VisibilityIcon color="primary" />
          <Typography variant="h6">
            Chi tiết đơn hàng - {order.orderCode || order.receiptCode}
          </Typography>
          <OrderTypeChip type={order.type} />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 2 }}>
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">
              {order.type === 'import' ? 'Nhà cung cấp:' : 'Khách hàng:'}
            </Typography>
            <Typography variant="body1">
              {order.supplier || order.customerName || 'Khách lẻ'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">Trạng thái:</Typography>
            <OrderStatusChip status={order.status} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">Tổng tiền:</Typography>
            <Typography variant="body1" fontWeight={600}>
              {order.totalAmount.toLocaleString('vi-VN')}đ
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" color="text.secondary">Tạo bởi:</Typography>
            <Typography variant="body1">{order.createdBy}</Typography>
          </Grid>
          {order.type === 'export' && order.paymentMethod && (
            <>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">Phương thức thanh toán:</Typography>
                <Typography variant="body1">
                  {order.paymentMethod === 'cash' ? 'Tiền mặt' : 
                   order.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">SĐT khách hàng:</Typography>
                <Typography variant="body1">{order.customerPhone || 'Không có'}</Typography>
              </Grid>
            </>
          )}
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
  
  // Notification hooks
  const {
    notification,
    hideNotification,
    showSuccess,
    showError,
    showWarning
  } = useNotification();

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
        showWarning('Vui lòng nhập tên nhân viên kho trước khi tạo phiếu');
        return;
      }

      const actualQuantities = warehouseReceipt.items.map(item => ({
        productId: item.productId,
        actualQuantity: item.actualQuantity
      }));

      const result = await dispatch(completeWarehouseReceipt(
        warehouseReceipt.orderId,
        actualQuantities,
        warehouseReceipt.warehouseStaff
      ));

      showSuccess(
        `Phiếu nhập kho ${result.warehouseReceiptCode} đã được tạo thành công! Tồn kho đã được cập nhật.`,
        'Tạo phiếu thành công',
        6000
      );
      onClose();
    } catch (error) {
      showError(
        `Lỗi khi tạo phiếu nhập kho: ${error.message}`,
        'Tạo phiếu thất bại',
        8000
      );
    }
  }, [warehouseReceipt, dispatch, onClose, showWarning, showSuccess, showError]);

  const handleClose = useCallback(() => {
    dispatch(clearWarehouseReceipt());
    onClose();
  }, [dispatch, onClose]);

  const totalActual = useMemo(() => {
    return warehouseReceipt.items.reduce((sum, item) => sum + (item.actualQuantity || 0), 0);
  }, [warehouseReceipt.items]);

  return (
    <>
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

      {/* Notification Snackbar */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        title={notification.title}
      />
    </>
  );
});

function OrderManager() {
  const dispatch = useDispatch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { importOrders, exportOrders, loading, error } = useSelector(state => state.order);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // State cho filters - bao gồm cả order code search và sort order
  const [orderType, setOrderType] = useState('all'); // 'all', 'import', 'export'
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [orderCodeSearch, setOrderCodeSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' hoặc 'oldest'
  
  // State cho view mode
  const [viewMode, setViewMode] = useState('cards'); // 'cards' hoặc 'table'

  // Notification hooks
  const {
    notification,
    hideNotification,
    showSuccess,
    showError,
    showInfo
  } = useNotification();

  // Effect để xử lý URL parameters từ notifications
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const searchParam = searchParams.get('search');

    if (filterParam) {
      if (filterParam === 'import') {
        setOrderType('import');
      } else if (filterParam === 'export') {
        setOrderType('export');
      }
    }

    if (searchParam) {
      setOrderCodeSearch(searchParam);
      showInfo(`Đang tìm kiếm đơn hàng: ${searchParam}`, '', 3000);
    }

    // Clear URL parameters sau khi đã áp dụng
    if (filterParam || searchParam) {
      // Tạo URL mới không có parameters
      const newUrl = location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, location.pathname, showInfo]);

  useEffect(() => {
    dispatch(fetchImportOrders());
    dispatch(fetchExportOrders());
  }, [dispatch]);

  // Kết hợp và lọc orders
  const allOrders = useMemo(() => {
    let combined = [];
    
    // Thêm import orders
    if (orderType === 'all' || orderType === 'import') {
      const importOrdersWithType = importOrders.map(order => ({
        ...order,
        type: 'import'
      }));
      combined = [...combined, ...importOrdersWithType];
    }
    
    // Thêm export orders
    if (orderType === 'all' || orderType === 'export') {
      const exportOrdersWithType = exportOrders.map(order => ({
        ...order,
        type: 'export',
        orderCode: order.receiptCode,
        supplier: order.customerName || 'Khách lẻ',
        status: 'completed'
      }));
      combined = [...combined, ...exportOrdersWithType];
    }
    
    // Sắp xếp theo thời gian tạo dựa trên sortOrder
    return combined.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      
      if (sortOrder === 'newest') {
        return dateB - dateA; // Mới nhất trước
      } else {
        return dateA - dateB; // Cũ nhất trước
      }
    });
  }, [importOrders, exportOrders, orderType, sortOrder]);

  // Lọc theo filters bao gồm cả order code search
  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      const matchStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchSupplier = !supplierFilter || 
        (order.supplier && order.supplier.toLowerCase().includes(supplierFilter.toLowerCase()));
      
      // Lọc theo mã đơn hàng
      const orderCode = order.orderCode || order.receiptCode || '';
      const matchOrderCode = !orderCodeSearch || 
        orderCode.toLowerCase().includes(orderCodeSearch.toLowerCase());
      
      return matchStatus && matchSupplier && matchOrderCode;
    });
  }, [allOrders, statusFilter, supplierFilter, orderCodeSearch]);

  // Thống kê theo trạng thái
  const statusStats = useMemo(() => {
    const stats = {
      all: allOrders.length,
      import: importOrders.length,
      export: exportOrders.length,
      draft: 0,
      processing: 0,
      delivered: 0,
      completed: 0,
      cancelled: 0
    };

    allOrders.forEach(order => {
      stats[order.status] = (stats[order.status] || 0) + 1;
    });

    return stats;
  }, [allOrders, importOrders, exportOrders]);

  // Lấy danh sách nhà cung cấp unique
  const suppliers = useMemo(() => {
    const uniqueSuppliers = [...new Set(
      allOrders
        .map(order => order.supplier)
        .filter(supplier => supplier)
    )];
    return uniqueSuppliers.sort();
  }, [allOrders]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchImportOrders());
    dispatch(fetchExportOrders());
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

  const handleOrderTypeChange = useCallback((event) => {
    setOrderType(event.target.value);
  }, []);

  const handleStatusFilterChange = useCallback((event) => {
    setStatusFilter(event.target.value);
  }, []);

  const handleSupplierFilterChange = useCallback((event) => {
    setSupplierFilter(event.target.value);
  }, []);

  const handleOrderCodeSearchChange = useCallback((event) => {
    setOrderCodeSearch(event.target.value);
  }, []);

  const handleClearOrderCodeSearch = useCallback(() => {
    setOrderCodeSearch('');
    showInfo('Đã xóa bộ lọc mã đơn hàng', '', 2000);
  }, [showInfo]);

  // NEW: Handler cho sort order
  const handleSortOrderChange = useCallback((event) => {
    setSortOrder(event.target.value);
    const sortText = event.target.value === 'newest' ? 'mới nhất trước' : 'cũ nhất trước';

  }, );

  const handleViewModeChange = useCallback((event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('vi-VN');
  }, []);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    setOrderType('all');
    setStatusFilter('all');
    setSupplierFilter('');
    setOrderCodeSearch('');
    setSortOrder('newest');

  },);

  // Render Table view
  const renderTableView = useCallback(() => (
    <Paper sx={{ mb: 3, minHeight: '400px', minWidth: '400px' }}>
      <TableContainer sx={{ minHeight: '350px' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Loại</TableCell>
              <TableCell>Mã đơn hàng</TableCell>
              <TableCell>Khách hàng/NCC</TableCell>
              <TableCell align="center">Trạng thái</TableCell>
              <TableCell align="right">Tổng tiền</TableCell>
              <TableCell align="center">Số SP</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  Thời gian tạo
                  {sortOrder === 'newest' ? 
                    <ArrowDownwardIcon fontSize="small" color="primary" /> :
                    <ArrowUpwardIcon fontSize="small" color="primary" />
                  }
                </Box>
              </TableCell>
              <TableCell align="center">Đặc biệt</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order) => (
              <TableRow 
                key={`${order.type}-${order._id}`} 
                hover
                sx={{
                  backgroundColor: orderCodeSearch && 
                    (order.orderCode || order.receiptCode || '').toLowerCase().includes(orderCodeSearch.toLowerCase())
                    ? 'action.selected' : 'transparent'
                }}
              >
                <TableCell>
                  <OrderTypeChip type={order.type} />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    color={orderCodeSearch && 
                      (order.orderCode || order.receiptCode || '').toLowerCase().includes(orderCodeSearch.toLowerCase())
                      ? 'primary.main' : 'primary.main'}
                  >
                    {order.orderCode || order.receiptCode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {order.type === 'import' ? <BusinessIcon fontSize="small" color="action" /> : <PersonIcon fontSize="small" color="action" />}
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
                    {order.status === 'processing' && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TimerIcon fontSize="small" color="info" sx={{ animation: 'spin 2s linear infinite' }} />
                        <Typography variant="caption" color="info.main" sx={{ fontStyle: 'italic' }}>
                          Đang chờ Email phản hồi...
                        </Typography>
                      </Box>
                    )}
                    {order.status === 'delivered' && (
                      <Alert severity="info" sx={{ py: 0, px: 1 }}>
                        <Typography variant="caption">Có thể nhập kho</Typography>
                      </Alert>
                    )}
                    {order.status === 'completed' && order.type === 'import' && (
                      <Alert severity="success" sx={{ py: 0, px: 1 }}>
                        <Typography variant="caption">
                          {order.warehouseReceiptCode}
                        </Typography>
                      </Alert>
                    )}
                    {order.type === 'export' && (
                      <Alert severity="success" sx={{ py: 0, px: 1 }}>
                        <Typography variant="caption">Đã xuất hàng</Typography>
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
                    {order.status === 'delivered' && order.type === 'import' && (
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
  ), [filteredOrders, orderCodeSearch, sortOrder, formatDate, handleRefresh, handleViewDetail, handleCreateWarehouseReceipt]);

  // Render Cards view
  const renderCardsView = useCallback(() => (
    <Grid container spacing={3} >
      {filteredOrders.map((order) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={`${order.type}-${order._id}`}>
          <Card
            sx={{
              border: orderCodeSearch && 
                (order.orderCode || order.receiptCode || '').toLowerCase().includes(orderCodeSearch.toLowerCase())
                ? '2px solid' : '1px solid',
              borderColor: orderCodeSearch && 
                (order.orderCode || order.receiptCode || '').toLowerCase().includes(orderCodeSearch.toLowerCase())
                ? 'primary.main' : 'divider',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
              
            }}
          >
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography 
                  variant="h6" 
                  fontWeight={600}
                  color={orderCodeSearch && 
                    (order.orderCode || order.receiptCode || '').toLowerCase().includes(orderCodeSearch.toLowerCase())
                    ? 'primary.main' : 'text.primary'}
                >
                  {order.orderCode || order.receiptCode}
                </Typography>
                <Box display="flex" gap={1}>
                  <OrderTypeChip type={order.type} />
                  <OrderStatusChip status={order.status} />
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                {order.type === 'import' ? <BusinessIcon fontSize="small" color="action" /> : <PersonIcon fontSize="small" color="action" />}
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

              {order.status === 'processing' && (
                <Alert severity="info" icon={<TimerIcon />} sx={{ mb: 2, py: 0 }}>
                  <Typography variant="caption">
                    Đang chờ nhà cung cấp phản hồi Email để xác nhận giao hàng.
                  </Typography>
                </Alert>
              )}

              {order.status === 'delivered' && order.type === 'import' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Hàng đã được giao. Có thể tạo phiếu nhập kho.
                </Alert>
              )}

              {order.status === 'completed' && order.type === 'import' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Đã hoàn thành. Mã phiếu: {order.warehouseReceiptCode}
                </Alert>
              )}

              {order.type === 'export' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Đã xuất hàng thành công
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
              {order.status === 'delivered' && order.type === 'import' && (
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
  ), [filteredOrders, orderCodeSearch, formatDate, handleRefresh, handleViewDetail, handleCreateWarehouseReceipt]);

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
            Quản lý đơn hàng
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
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600}>{statusStats.all}</Typography>
            <Typography variant="caption" color="text.secondary">Tổng đơn</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="primary.main">{statusStats.import}</Typography>
            <Typography variant="caption" color="text.secondary">Nhập hàng</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="success.main">{statusStats.export}</Typography>
            <Typography variant="caption" color="text.secondary">Xuất hàng</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="warning.main">{statusStats.processing}</Typography>
            <Typography variant="caption" color="text.secondary">Đang xử lý</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="info.main">{statusStats.delivered}</Typography>
            <Typography variant="caption" color="text.secondary">Đã giao</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ textAlign: 'center', p: 1 }}>
            <Typography variant="h5" fontWeight={600} color="success.main">{statusStats.completed}</Typography>
            <Typography variant="caption" color="text.secondary">Hoàn thành</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FilterIcon color="action" />
          <Typography variant="h6" fontWeight={600}>
            Bộ lọc và sắp xếp
          </Typography>
        </Box>
        
        <Grid container spacing={2} alignItems="center">
          {/* Order Code Search */}
          <Grid item sx={{ width: 250 }}>
            <TextField
              fullWidth
              size="small"
              label="Tìm mã đơn hàng"
              value={orderCodeSearch}
              onChange={handleOrderCodeSearchChange}
              placeholder="Nhập mã đơn hàng..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: orderCodeSearch && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleClearOrderCodeSearch}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item sx={{ width: 200 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Loại đơn hàng</InputLabel>
              <Select
                value={orderType}
                onChange={handleOrderTypeChange}
                label="Loại đơn hàng"
              >
                <MenuItem value="all">Tất cả ({statusStats.all})</MenuItem>
                <MenuItem value="import">Nhập hàng ({statusStats.import})</MenuItem>
                <MenuItem value="export">Xuất hàng ({statusStats.export})</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
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
              <InputLabel>Khách hàng/NCC</InputLabel>
              <Select
                value={supplierFilter}
                onChange={handleSupplierFilterChange}
                label="Khách hàng/NCC"
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

          {/* NEW: Sort Order Filter */}
          <Grid item sx={{ width: 220 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Sắp xếp thời gian</InputLabel>
              <Select
                value={sortOrder}
                onChange={handleSortOrderChange}
                label="Sắp xếp thời gian"
                startAdornment={<SortIcon fontSize="small" sx={{ mr: 1 }} />}
              >
                <MenuItem value="newest">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ArrowDownwardIcon fontSize="small" />
                    Mới nhất trước
                  </Box>
                </MenuItem>
                <MenuItem value="oldest">
                  <Box display="flex" alignItems="center" gap={1}>
                    <ArrowUpwardIcon fontSize="small" />
                    Cũ nhất trước
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item sx={{ width: 150 }}>
            <Typography variant="body2" color="text.secondary">
              Hiển thị: <strong>{filteredOrders.length}</strong> đơn hàng
              {orderCodeSearch && (
                <>
                  <br />
                  <Typography variant="caption" color="primary.main">
                    Tìm kiếm: "{orderCodeSearch}"
                  </Typography>
                </>
              )}
              <br />
              <Typography variant="caption" color="text.secondary">
                Sắp xếp: {sortOrder === 'newest' ? 'Mới → Cũ' : 'Cũ → Mới'}
              </Typography>
            </Typography>
          </Grid>
          
          <Grid item sx={{ width: 120 }}>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={handleClearAllFilters}
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
            {orderCodeSearch ? 
              `Không tìm thấy đơn hàng với mã "${orderCodeSearch}"` : 
              'Không tìm thấy đơn hàng'
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {orderCodeSearch ? 
              'Thử kiểm tra lại mã đơn hàng hoặc thay đổi bộ lọc' :
              'Thử thay đổi bộ lọc hoặc tạo đơn hàng mới'
            }
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

      {/* Notification Snackbar */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        title={notification.title}
      />
    </Box>
  );
}

export default OrderManager;