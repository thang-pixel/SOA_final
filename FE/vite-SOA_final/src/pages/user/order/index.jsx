import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import API_DOMAIN from '../../../constants/apiDomain';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  InputAdornment,
  Grid,
  Divider,
  Card,
  CardContent,
  Chip,
  Alert,
  Autocomplete,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Business as BusinessIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  updateImportItem,
  removeImportItem,
  setImportSupplier,
  setImportNotes,
  clearCurrentImportOrder,
  addImportItem
} from '../../../redux/reducers/orderSlice';
import {
  saveImportOrder,
  submitImportOrder
} from '../../../redux/action/orderAction';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirm } from '../../../hooks/useConfirm';
import NotificationSnackbar from '../../../components/NotificationSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';

// Component hiển thị các bước
const OrderSteps = React.memo(({ activeStep }) => {
  const steps = [
    'Tạo đơn hàng',
    'Gửi nhà cung cấp', 
    'Đang xử lý',
    'Đã giao hàng',
    'Hoàn thành'
  ];

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
});

function ImportOrder() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { currentImportOrder, loading } = useSelector(state => state.order);
  const { user } = useSelector(state => state.auth);

  // Notification system
  const {
    notification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useNotification();

  // Confirm dialog system
  const {
    confirmState,
    showConfirm,
    hideConfirm,
    setLoading: setConfirmLoading
  } = useConfirm();

  // Xử lý auto-select sản phẩm từ notification tồn kho thấp
  useEffect(() => {
    const loadLowStockProduct = async () => {
      if (location.state?.lowStockProduct && location.state?.autoSelectProduct) {
        const { productId, productCode, productName, currentStock, minThreshold, supplier } = location.state.lowStockProduct;
        
        try {
          // Fetch product details từ API
          const response = await axios.get(`${API_DOMAIN}/api/inventory/product/getAll`);
          const product = response.data.find(p => p._id === productId);
          
          if (product) {
            // Tính số lượng cần nhập (ít nhất bằng ngưỡng tối thiểu)
            const quantityNeeded = Math.max(minThreshold - currentStock, minThreshold);
            
            // Tạo import item
            const importItem = {
              productId: product._id,
              productCode: product.code,
              productName: product.name,
              quantity: quantityNeeded,
              unitPrice: product.cost || 0,
              discount: 0,
              totalPrice: quantityNeeded * (product.cost || 0)
            };
            
            // Thêm vào đơn hàng
            dispatch(addImportItem(importItem));
            
            // Set supplier nếu có
            if (supplier) {
              dispatch(setImportSupplier(supplier));
            }
            
            showWarning(
              `Sản phẩm "${productName}" (${productCode}) đang ở mức tồn kho thấp (${currentStock}/${minThreshold}). Đã tự động thêm vào đơn nhập hàng với số lượng đề xuất: ${quantityNeeded}`,
              8000
            );
          }
        } catch (error) {
          console.error('Error loading low stock product:', error);
          showError('Không thể tải thông tin sản phẩm');
        }
        
        // Clear location state để tránh reload lại
        navigate(location.pathname, { replace: true, state: {} });
      }
    };
    
    loadLowStockProduct();
  }, [location, dispatch, navigate, showWarning, showError]);

  // Danh sách nhà cung cấp mẫu
  const suppliers = useMemo(() => [
    'Công ty TNHH ABC',
    'Công ty CP XYZ', 
    'Công ty Cổ phần Thực phẩm DEF',
    'Tập đoàn GHI',
    'Công ty TNHH MTV JKL',
    'Nhà phân phối MNO',
    'Công ty Dược phẩm PQR',
    'Công ty Mỹ phẩm STU',
    'Công ty Gia dụng VWX',
    'Tổng công ty YZ'
  ], []);

  // useEffect(() => {
  //   if (!currentImportOrder.items.length) {
  //     showWarning('Chưa có sản phẩm nào được chọn để nhập hàng');
  //     setTimeout(() => navigate('/inventory'), 2000);
  //   }
  // }, [currentImportOrder, navigate, showWarning]);

  const handleBack = useCallback(async () => {
    if (currentImportOrder.items.length > 0) {
      const confirmed = await showConfirm({
        title: 'Thoát khỏi trang tạo đơn hàng',
        message: 'Bạn có chắc chắn muốn thoát? Dữ liệu đang nhập sẽ bị mất.',
        type: 'warning',
        confirmText: 'Thoát',
        cancelText: 'Ở lại'
      });

      if (confirmed) {
        dispatch(clearCurrentImportOrder());
        showInfo('Đã hủy tạo đơn nhập hàng');
        navigate('/inventory');
      }
    } else {
      dispatch(clearCurrentImportOrder());
      navigate('/inventory');
    }
  }, [dispatch, navigate, currentImportOrder.items.length, showConfirm, showInfo]);

  const handleQuantityChange = useCallback((index, quantity) => {
    if (quantity < 0) {
      showWarning('Số lượng phải lớn hơn 0');
      return;
    }

    const item = currentImportOrder.items[index];
    const totalPrice = quantity * item.unitPrice * (1 - item.discount / 100);
    
    const updatedItem = {
      ...item,
      quantity: quantity,
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
    

  }, [currentImportOrder.items, dispatch, showWarning]);

  const handlePriceChange = useCallback((index, price) => {
    if (price < 0) {
      showWarning('Giá phải lớn hơn 0');
      return;
    }

    const item = currentImportOrder.items[index];
    const totalPrice = item.quantity * price * (1 - item.discount / 100);
    
    const updatedItem = {
      ...item,
      unitPrice: price,
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
    

  }, [currentImportOrder.items, dispatch, showWarning]);

  const handleDiscountChange = useCallback((index, discount) => {
    const discountPercent = Math.min(100, Math.max(0, discount));
    const item = currentImportOrder.items[index];
    const totalPrice = item.quantity * item.unitPrice * (1 - discountPercent / 100);
    
    const updatedItem = {
      ...item,
      discount: discountPercent,
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
    

  }, [currentImportOrder.items, dispatch, showWarning]);

  const handleRemoveItem = useCallback(async (index) => {
    const item = currentImportOrder.items[index];
    
    const confirmed = await showConfirm({
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc chắn muốn xóa "${item.productName}" khỏi đơn hàng?`,
      type: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      dispatch(removeImportItem(index));
      showSuccess(`Đã xóa "${item.productName}" khỏi đơn hàng`, '', 3000);
    }
  }, [currentImportOrder.items, dispatch, showConfirm, showSuccess]);

  const handleSupplierChange = useCallback((event, value) => {
    dispatch(setImportSupplier(value || ''));

  }, [dispatch]);

  const handleNotesChange = useCallback((e) => {
    dispatch(setImportNotes(e.target.value));
  }, [dispatch]);

  const validateOrder = useCallback(() => {
    if (!currentImportOrder.supplier.trim()) {
      showWarning('Vui lòng chọn nhà cung cấp trước khi lưu đơn hàng', 5000);
      return false;
    }

    if (currentImportOrder.items.length === 0) {
      showWarning('Đơn hàng phải có ít nhất một sản phẩm', 5000);
      return false;
    }

    const invalidItems = currentImportOrder.items.filter(item => item.quantity <= 0 || item.unitPrice <= 0);
    if (invalidItems.length > 0) {
      showWarning('Vui lòng nhập số lượng và giá hợp lệ cho tất cả sản phẩm (> 0)', 6000);
      return false;
    }

    return true;
  }, [currentImportOrder, showWarning]);

  const handleSaveDraft = useCallback(async () => {
    if (!validateOrder()) return;

    const confirmed = await showConfirm({
      title: 'Lưu đơn hàng tạm',
      message: `Lưu đơn nhập hàng từ ${currentImportOrder.supplier} với ${currentImportOrder.items.length} sản phẩm?`,
      type: 'question',
      confirmText: 'Lưu tạm',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setConfirmLoading(true);
      const result = await dispatch(saveImportOrder(currentImportOrder, user.username || 'admin'));
      
      showSuccess(
        `Đơn nhập hàng ${result.orderCode} đã được lưu thành công! Bạn có thể tiếp tục chỉnh sửa sau.`,
        'Lưu thành công',
        6000
      );
      
      dispatch(clearCurrentImportOrder());
      navigate('/order');
    } catch (error) {
      showError(
        `Lỗi khi lưu đơn nhập hàng: ${error.message}`,
        'Lưu thất bại',
        8000
      );
    } finally {
      setConfirmLoading(false);
    }
  }, [currentImportOrder, dispatch, user, navigate, validateOrder, showConfirm, showSuccess, showError, setConfirmLoading]);

  const handleSubmit = useCallback(async () => {
    if (!validateOrder()) return;

    const confirmed = await showConfirm({
      title: 'Gửi đơn hàng cho nhà cung cấp',
      message: `Gửi đơn nhập hàng đến ${currentImportOrder.supplier}? Sau khi gửi, đơn hàng sẽ được nhà cung cấp xử lý và không thể chỉnh sửa.`,
      type: 'warning',
      confirmText: 'Gửi đơn hàng',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setConfirmLoading(true);
      const result = await dispatch(submitImportOrder(currentImportOrder, user.username || 'admin'));
      
      showSuccess(
        `Đơn nhập hàng ${result.orderCode} đã được gửi thành công! Đơn hàng đang được ${currentImportOrder.supplier} xử lý. Bạn sẽ nhận được thông báo khi có phản hồi.`,
        'Gửi đơn thành công',
        10000
      );
      
      dispatch(clearCurrentImportOrder());
      navigate('/order');
    } catch (error) {
      showError(
        `Lỗi khi gửi đơn nhập hàng: ${error.message}`,
        'Gửi đơn thất bại',
        10000
      );
    } finally {
      setConfirmLoading(false);
    }
  }, [currentImportOrder, dispatch, user, navigate, validateOrder, showConfirm, showSuccess, showError, setConfirmLoading]);

  // Tính tổng số lượng và tổng tiền
  const summary = useMemo(() => {
    const totalQuantity = currentImportOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = currentImportOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalDiscount = currentImportOrder.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice * item.discount / 100), 0);
    
    return { totalQuantity, totalAmount, totalDiscount };
  }, [currentImportOrder.items]);

  // // Kiểm tra nếu không có sản phẩm
  // if (currentImportOrder.items.length === 0) {
  //   return (
  //     <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
  //       <Alert severity="warning" sx={{ mb: 2, maxWidth: 600 }}>
  //         <Typography variant="h6" gutterBottom>
  //           Chưa có sản phẩm nào được chọn
  //         </Typography>
  //         <Typography>
  //           Vui lòng quay lại trang kho hàng và chọn các sản phẩm cần nhập hàng.
  //         </Typography>
  //       </Alert>
  //       <Button
  //         variant="outlined"
  //         startIcon={<ArrowBackIcon />}
  //         onClick={() => navigate('/inventory')}
  //         sx={{ textTransform: 'none' }}
  //       >
  //         Quay lại kho hàng
  //       </Button>

  //       <NotificationSnackbar
  //         open={notification.open}
  //         message={notification.message}
  //         severity={notification.severity}
  //         autoHideDuration={notification.autoHideDuration}
  //         onClose={hideNotification}
  //         title={notification.title}
  //       />
  //     </Box>
  //   );
  // }

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <ReceiptIcon sx={{ mr: 1, fontSize: 32 }} color="primary" />
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Tạo đơn nhập hàng
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={handleSaveDraft}
            disabled={loading || confirmState.loading}
            sx={{ textTransform: 'none' }}
          >
            {confirmState.loading ? 'Đang lưu...' : 'Lưu tạm'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={loading || confirmState.loading}
            sx={{ textTransform: 'none' }}
          >
            {confirmState.loading ? 'Đang gửi...' : 'Gửi đơn hàng'}
          </Button>
        </Box>
      </Box>

      {/* Progress Steps */}
      <OrderSteps activeStep={0} />

      {/* Alert cho sản phẩm tồn kho thấp */}
      {location.state?.lowStockProduct && (
        <Alert 
          severity="warning" 
          icon={<WarningIcon />}
          sx={{ mb: 3 }}
          onClose={() => navigate(location.pathname, { replace: true, state: {} })}
        >
          <Typography variant="body2" fontWeight={600}>
            Cảnh báo tồn kho thấp!
          </Typography>
          <Typography variant="body2">
            Sản phẩm <strong>{location.state.lowStockProduct.productName}</strong> ({location.state.lowStockProduct.productCode}) 
            chỉ còn <strong>{location.state.lowStockProduct.currentStock}</strong> sản phẩm, 
            dưới ngưỡng tối thiểu <strong>{location.state.lowStockProduct.minThreshold}</strong>. 
            Đã tự động thêm vào đơn nhập hàng.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Form thông tin */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Thông tin đơn hàng
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box mb={2}>
              <Autocomplete
                fullWidth
                options={suppliers}
                value={currentImportOrder.supplier}
                onChange={handleSupplierChange}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nhà cung cấp"
                    placeholder="Chọn hoặc nhập nhà cung cấp"
                    size="small"
                    required
                    error={!currentImportOrder.supplier.trim()}
                    helperText={!currentImportOrder.supplier.trim() ? 'Vui lòng chọn nhà cung cấp' : ''}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <BusinessIcon sx={{ color: 'action.active', mr: 1, fontSize: 20 }} />
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <BusinessIcon sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                    {option}
                  </Box>
                )}
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Ghi chú"
              value={currentImportOrder.notes}
              onChange={handleNotesChange}
              placeholder="Nhập ghi chú cho đơn hàng..."
              size="small"
            />
          </Paper>

          {/* Tóm tắt */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Tóm tắt đơn hàng
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Số sản phẩm:</Typography>
                <Chip 
                  label={currentImportOrder.items.length}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Tổng số lượng:</Typography>
                <Chip 
                  label={summary.totalQuantity}
                  size="small"
                  color="primary"
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Tổng tiền hàng:</Typography>
                <Typography fontWeight={600}>
                  {summary.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>

              {summary.totalDiscount > 0 && (
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography color="text.secondary">Tổng giảm giá:</Typography>
                  <Typography fontWeight={600} color="success.main">
                    -{summary.totalDiscount.toLocaleString('vi-VN')}đ
                  </Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight={600}>Tổng cộng:</Typography>
                <Typography variant="h6" fontWeight={600} color="primary.main">
                  {summary.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>

              {currentImportOrder.supplier && (
                <Box mt={2}>
                  <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                    Đơn hàng sẽ được gửi đến <strong>{currentImportOrder.supplier}</strong>
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Bảng sản phẩm */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Danh sách sản phẩm đặt hàng ({currentImportOrder.items.length})
              </Typography>
            </Box>
            
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Mã hàng</TableCell>
                    <TableCell>Tên hàng</TableCell>
                    <TableCell align="center">Số lượng</TableCell>
                    <TableCell align="center">Đơn giá</TableCell>
                    <TableCell align="center">Giảm giá (%)</TableCell>
                    <TableCell align="center">Thành tiền</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentImportOrder.items.map((item, index) => (
                    <TableRow 
                      key={`${item.productId}-${index}`}
                      sx={{
                        backgroundColor: (item.quantity <= 0 || item.unitPrice <= 0) 
                          ? 'error.light' 
                          : 'transparent'
                      }}
                    >
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Typography color="primary" fontWeight={500}>
                          {item.productCode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1, style: { textAlign: 'center' } }}
                          size="small"
                          sx={{ width: 80 }}
                          error={item.quantity <= 0}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(index, parseInt(e.target.value) || 0)}
                          inputProps={{ min: 1, style: { textAlign: 'center' } }}
                          size="small"
                          sx={{ width: 100 }}
                          error={item.unitPrice <= 0}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">đ</InputAdornment>
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={item.discount}
                          onChange={(e) => handleDiscountChange(index, parseInt(e.target.value) || 0)}
                          inputProps={{ min: 0, max: 100, style: { textAlign: 'center' } }}
                          size="small"
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={600} color="success.main">
                          {item.totalPrice.toLocaleString('vi-VN')}đ
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          onClick={() => handleRemoveItem(index)}
                          color="error"
                          size="small"
                          title={`Xóa ${item.productName}`}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Notification Snackbar */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        title={notification.title}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onClose={hideConfirm}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        loading={confirmState.loading}
      />
    </Box>
  );
}

export default ImportOrder;