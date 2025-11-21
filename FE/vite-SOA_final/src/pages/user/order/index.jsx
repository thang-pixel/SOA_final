import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import {
  updateImportItem,
  removeImportItem,
  setImportSupplier,
  setImportNotes,
  clearCurrentImportOrder
} from '../../../redux/reducers/orderSlice';
import {
  saveImportOrder,
  submitImportOrder
} from '../../../redux/action/orderAction';

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
  
  const { currentImportOrder, loading } = useSelector(state => state.order);
  const { user } = useSelector(state => state.auth);

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

  useEffect(() => {
    if (!currentImportOrder.items.length) {
      navigate('/user/inventory');
    }
  }, [currentImportOrder, navigate]);

  const handleBack = useCallback(() => {
    dispatch(clearCurrentImportOrder());
    navigate('/user/inventory');
  }, [dispatch, navigate]);

  const handleQuantityChange = useCallback((index, quantity) => {
    const item = currentImportOrder.items[index];
    const totalPrice = quantity * item.unitPrice * (1 - item.discount / 100);
    
    const updatedItem = {
      ...item,
      quantity: Math.max(0, quantity),
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
  }, [currentImportOrder.items, dispatch]);

  const handlePriceChange = useCallback((index, price) => {
    const item = currentImportOrder.items[index];
    const totalPrice = item.quantity * price * (1 - item.discount / 100);
    
    const updatedItem = {
      ...item,
      unitPrice: Math.max(0, price),
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
  }, [currentImportOrder.items, dispatch]);

  const handleDiscountChange = useCallback((index, discount) => {
    const item = currentImportOrder.items[index];
    const discountPercent = Math.min(100, Math.max(0, discount));
    const totalPrice = item.quantity * item.unitPrice * (1 - discountPercent / 100);
    
    const updatedItem = {
      ...item,
      discount: discountPercent,
      totalPrice
    };
    
    dispatch(updateImportItem({ index, item: updatedItem }));
  }, [currentImportOrder.items, dispatch]);

  const handleRemoveItem = useCallback((index) => {
    dispatch(removeImportItem(index));
  }, [dispatch]);

  const handleSupplierChange = useCallback((event, value) => {
    dispatch(setImportSupplier(value || ''));
  }, [dispatch]);

  const handleNotesChange = useCallback((e) => {
    dispatch(setImportNotes(e.target.value));
  }, [dispatch]);

  const handleSaveDraft = useCallback(async () => {
    try {
      if (!currentImportOrder.supplier) {
        alert('Vui lòng chọn nhà cung cấp');
        return;
      }

      if (currentImportOrder.items.some(item => item.quantity <= 0)) {
        alert('Vui lòng nhập số lượng cho tất cả sản phẩm');
        return;
      }

      await dispatch(saveImportOrder(currentImportOrder, user.username || 'admin'));
      alert('Lưu đơn nhập hàng thành công');
      dispatch(clearCurrentImportOrder());
      navigate('/user/order-manager');
    } catch (error) {
      alert('Lỗi khi lưu đơn nhập hàng: ' + error.message);
    }
  }, [currentImportOrder, dispatch, user, navigate]);

  const handleSubmit = useCallback(async () => {
    try {
      if (!currentImportOrder.supplier) {
        alert('Vui lòng chọn nhà cung cấp');
        return;
      }

      if (currentImportOrder.items.some(item => item.quantity <= 0)) {
        alert('Vui lòng nhập số lượng cho tất cả sản phẩm');
        return;
      }

      await dispatch(submitImportOrder(currentImportOrder, user.username || 'admin'));
      
      alert('Gửi đơn nhập hàng thành công! Đơn hàng đang được nhà cung cấp xử lý.');
      dispatch(clearCurrentImportOrder());
      navigate('/user/order-manager');
    } catch (error) {
      alert('Lỗi khi gửi đơn nhập hàng: ' + error.message);
    }
  }, [currentImportOrder, dispatch, user, navigate]);

  // Tính tổng số lượng và tổng tiền
  const summary = useMemo(() => {
    const totalQuantity = currentImportOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = currentImportOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    return { totalQuantity, totalAmount };
  }, [currentImportOrder.items]);

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
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Lưu tạm
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Gửi đơn hàng
          </Button>
        </Box>
      </Box>

      {/* Progress Steps */}
      <OrderSteps activeStep={0} />

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
                <Typography color="text.secondary">Tổng tiền hàng:</Typography>
                <Typography fontWeight={600}>
                  {summary.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography color="text.secondary">Tổng số lượng:</Typography>
                <Chip 
                  label={summary.totalQuantity}
                  size="small"
                  color="primary"
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="h6" fontWeight={600}>Tổng cộng:</Typography>
                <Typography variant="h6" fontWeight={600} color="primary.main">
                  {summary.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bảng sản phẩm */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Danh sách sản phẩm đặt hàng
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
                    <TableRow key={`${item.productId}-${index}`}>
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
                          inputProps={{ min: 0, style: { textAlign: 'center' } }}
                          size="small"
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handlePriceChange(index, parseInt(e.target.value) || 0)}
                          inputProps={{ min: 0, style: { textAlign: 'center' } }}
                          size="small"
                          sx={{ width: 100 }}
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
    </Box>
  );
}

export default ImportOrder;