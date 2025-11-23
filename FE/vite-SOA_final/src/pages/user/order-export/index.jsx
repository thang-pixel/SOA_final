import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Payment as PaymentIcon,
  Print as PrintIcon,
  CheckCircle as CheckCircleIcon,
  ShoppingCart as ShoppingCartIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  updateExportItem,
  removeExportItem,
  setExportCustomer,
  setExportPaymentMethod,
  setExportNotes,
  clearCurrentExportOrder
} from '../../../redux/reducers/orderSlice';
import {
  saveExportOrder
} from '../../../redux/action/orderAction';
import { fetchInventoryItems } from '../../../redux/action/inventory';
import { useNotification } from '../../../hooks/useNotification';
import { useConfirm } from '../../../hooks/useConfirm';
import NotificationSnackbar from '../../../components/NotificationSnackbar';
import ConfirmDialog from '../../../components/ConfirmDialog';

function ExportOrder() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { currentExportOrder, loading } = useSelector(state => state.order);
  const { user } = useSelector(state => state.auth);
  const { items: inventoryItems, loading: inventoryLoading } = useSelector(state => state.inventory);
  
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

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

  // Load inventory data on component mount
  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  // Get current stock for a product
  const getProductStock = useCallback((productId) => {
    const product = inventoryItems.find(item => item._id === productId);
    return product ? (product.stock || 0) : 0;
  }, [inventoryItems]);

  // Check if product has sufficient stock
  const checkStockAvailability = useCallback((productId, requestedQuantity) => {
    const currentStock = getProductStock(productId);
    return {
      available: currentStock,
      sufficient: requestedQuantity <= currentStock,
      isLowStock: currentStock <= 5,
      isEmpty: currentStock <= 0
    };
  }, [getProductStock]);

  const handleBack = useCallback(async () => {
    if (currentExportOrder.items.length > 0) {
      const confirmed = await showConfirm({
        title: 'Thoát khỏi trang xuất hàng',
        message: 'Bạn có chắc chắn muốn thoát? Giỏ hàng hiện tại sẽ bị xóa.',
        type: 'warning',
        confirmText: 'Thoát',
        cancelText: 'Ở lại'
      });

      if (confirmed) {
        dispatch(clearCurrentExportOrder());
        showInfo('Đã hủy phiếu xuất hàng');
        navigate('/inventory');
      }
    } else {
      dispatch(clearCurrentExportOrder());
      navigate('/inventory');
    }
  }, [dispatch, navigate, currentExportOrder.items.length, showConfirm, showInfo]);

  const handleQuantityChange = useCallback((index, quantity) => {
    if (quantity < 1) {
      showWarning('Số lượng phải lớn hơn 0');

    }

    const item = currentExportOrder.items[index];
    const stockCheck = checkStockAvailability(item.productId, quantity);
    
    if (!stockCheck.sufficient) {
      showWarning(
        `Số lượng xuất (${quantity}) vượt quá tồn kho hiện có (${stockCheck.available}) của sản phẩm "${item.productName}"`,
        'Không đủ tồn kho',
        8000
      );

    }

    // Show warning if quantity is close to stock limit
    if (stockCheck.isLowStock && quantity > stockCheck.available * 0.8) {
      showInfo(
        `Cảnh báo: Sản phẩm "${item.productName}" sắp hết hàng (còn ${stockCheck.available} sản phẩm)`,
        'Tồn kho thấp',
        5000
      );
    }

    const totalPrice = quantity * item.unitPrice;
    
    const updatedItem = {
      ...item,
      quantity: quantity,
      totalPrice
    };
    
    dispatch(updateExportItem({ index, item: updatedItem }));
  }, [currentExportOrder.items, dispatch, showWarning, showInfo, checkStockAvailability]);

  const handleRemoveItem = useCallback(async (index) => {
    const item = currentExportOrder.items[index];
    
    const confirmed = await showConfirm({
      title: 'Xóa sản phẩm khỏi giỏ hàng',
      message: `Bạn có chắc chắn muốn xóa "${item.productName}" khỏi giỏ hàng?`,
      type: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy'
    });

    if (confirmed) {
      dispatch(removeExportItem(index));
      showSuccess(`Đã xóa "${item.productName}" khỏi giỏ hàng`, '', 3000);
    }
  }, [currentExportOrder.items, dispatch, showConfirm, showSuccess]);

  const handleCustomerChange = useCallback((field, value) => {
    const newCustomer = {
      customerName: currentExportOrder.customerName,
      customerPhone: currentExportOrder.customerPhone,
      [field]: value
    };
    dispatch(setExportCustomer(newCustomer));
    
    if (field === 'customerName' && value) {
      showInfo(`Khách hàng: ${value}`, '', 2000);
    }
  }, [currentExportOrder, dispatch, showInfo]);

  const handlePaymentMethodChange = useCallback((e) => {
    const method = e.target.value;
    dispatch(setExportPaymentMethod(method));
  }, [dispatch]);

  const handleNotesChange = useCallback((e) => {
    dispatch(setExportNotes(e.target.value));
  }, [dispatch]);

  const validateOrder = useCallback(() => {
    if (currentExportOrder.items.length === 0) {
      showWarning('Giỏ hàng trống! Vui lòng thêm sản phẩm trước khi thanh toán', 5000);
      return false;
    }

    const invalidItems = currentExportOrder.items.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      showWarning('Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm (> 0)', 6000);
      return false;
    }

    // Check stock for each item
    const outOfStockItems = [];
    currentExportOrder.items.forEach(item => {
      const stockCheck = checkStockAvailability(item.productId, item.quantity);
      if (!stockCheck.sufficient) {
        outOfStockItems.push({
          name: item.productName,
          requested: item.quantity,
          available: stockCheck.available
        });
      }
    });

    if (outOfStockItems.length > 0) {
      const errorMessage = outOfStockItems
        .map(item => `• ${item.name}: yêu cầu ${item.requested}, tồn kho ${item.available}`)
        .join('\n');
      
      showError(
        `Các sản phẩm sau vượt quá tồn kho:\n${errorMessage}`,
        'Không đủ hàng tồn kho',
        10000
      );
      return false;
    }

    return true;
  }, [currentExportOrder, showWarning, showError, checkStockAvailability]);

  const handleCheckout = useCallback(async () => {
    if (!validateOrder()) return;

    const customerInfo = currentExportOrder.customerName 
      ? `${currentExportOrder.customerName}` 
      : 'Khách lẻ';

    const confirmed = await showConfirm({
      title: 'Xác nhận thanh toán',
      message: `Xác nhận thanh toán cho ${customerInfo}?\n\nTổng tiền: ${currentExportOrder.totalAmount.toLocaleString('vi-VN')}đ\nPhương thức: ${currentExportOrder.paymentMethod === 'cash' ? 'Tiền mặt' : currentExportOrder.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'}`,
      type: 'question',
      confirmText: 'Thanh toán',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      setConfirmLoading(true);
      const result = await dispatch(saveExportOrder(currentExportOrder, user.username || 'admin'));
      
      setCompletedOrder(result);
      setShowReceiptDialog(true);
      
      showSuccess(
        `Thanh toán thành công! Phiếu xuất hàng ${result.receiptCode} đã được tạo.`,
        'Thanh toán hoàn tất',
        6000
      );
    } catch (error) {
      showError(
        `Lỗi khi tạo phiếu xuất hàng: ${error.message}`,
        'Thanh toán thất bại',
        8000
      );
    } finally {
      setConfirmLoading(false);
    }
  }, [currentExportOrder, dispatch, user, validateOrder, showConfirm, showSuccess, showError, setConfirmLoading]);

  const handlePrintReceipt = useCallback(() => {
    if (!completedOrder) return;

    // Tạo nội dung in hóa đơn
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Xuất Hàng - ${completedOrder.receiptCode}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .info { margin-bottom: 15px; }
          .info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .number { text-align: right; }
          .total { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 10px; }
          .footer { margin-top: 30px; text-align: center; border-top: 1px solid #ddd; padding-top: 20px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .receipt-code { font-size: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">ABC INVENTORY SYSTEM</div>
          <div class="receipt-code">PHIẾU XUẤT HÀNG - ${completedOrder.receiptCode}</div>
        </div>
        
        <div class="info">
          <p><strong>Ngày giờ:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          <p><strong>Khách hàng:</strong> ${completedOrder.customerName || 'Khách lẻ'}</p>
          <p><strong>Số điện thoại:</strong> ${completedOrder.customerPhone || 'N/A'}</p>
          <p><strong>Phương thức thanh toán:</strong> ${
            completedOrder.paymentMethod === 'cash' ? 'Tiền mặt' : 
            completedOrder.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'
          }</p>
          <p><strong>Nhân viên bán hàng:</strong> ${user.username || 'admin'}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 8%">STT</th>
              <th style="width: 45%">Tên sản phẩm</th>
              <th style="width: 12%" class="number">SL</th>
              <th style="width: 20%" class="number">Đơn giá</th>
              <th style="width: 15%" class="number">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${completedOrder.items.map((item, index) => `
              <tr>
                <td style="text-align: center">${index + 1}</td>
                <td>${item.productName}<br><small style="color: #666">${item.productCode}</small></td>
                <td class="number">${item.quantity}</td>
                <td class="number">${item.unitPrice.toLocaleString('vi-VN')}đ</td>
                <td class="number">${item.totalPrice.toLocaleString('vi-VN')}đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          <p style="text-align: right; font-size: 20px; margin: 10px 0;">
            <strong>TỔNG CỘNG: ${completedOrder.totalAmount.toLocaleString('vi-VN')}đ</strong>
          </p>
        </div>
        
        <div class="footer">
          <p><strong>Cảm ơn quý khách đã mua hàng!</strong></p>
          <p>Hẹn gặp lại!</p>
          <br>
          <p style="font-size: 12px; color: #666;">
            Phiếu này được tạo bởi ABC Inventory System<br>
            ${new Date().toLocaleString('vi-VN')}
          </p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
    
    showSuccess('Hóa đơn đã được gửi đến máy in!', '', 3000);
  }, [completedOrder, user.username, showSuccess]);

  const handleCloseReceipt = useCallback(() => {
    setShowReceiptDialog(false);
    dispatch(clearCurrentExportOrder());
    navigate('/inventory');
  }, [dispatch, navigate]);

  // Tính tổng số lượng và kiểm tra tồn kho
  const summary = useMemo(() => {
    const totalQuantity = currentExportOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalItems = currentExportOrder.items.length;
    
    // Count items with stock issues
    const stockIssues = currentExportOrder.items.filter(item => {
      const stockCheck = checkStockAvailability(item.productId, item.quantity);
      return !stockCheck.sufficient || stockCheck.isEmpty;
    });
    
    return { 
      totalQuantity, 
      totalItems,
      hasStockIssues: stockIssues.length > 0,
      stockIssuesCount: stockIssues.length
    };
  }, [currentExportOrder.items, checkStockAvailability]);

  // Kiểm tra nếu không có sản phẩm
  if (currentExportOrder.items.length === 0) {
    return (
      <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Alert severity="warning" sx={{ mb: 2, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Giỏ hàng trống
          </Typography>
          <Typography>
            Chưa có sản phẩm nào được chọn để xuất hàng. Vui lòng quay lại trang kho hàng và chọn sản phẩm cần bán.
          </Typography>
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/inventory')}
          sx={{ textTransform: 'none' }}
        >
          Quay lại kho hàng
        </Button>

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

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <ShoppingCartIcon sx={{ mr: 1, fontSize: 32 }} color="primary" />
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Thanh toán - Phiếu xuất hàng
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<CheckCircleIcon />}
          onClick={handleCheckout}
          disabled={loading || confirmState.loading || currentExportOrder.items.length === 0 || summary.hasStockIssues || inventoryLoading}
          size="large"
          sx={{ textTransform: 'none', px: 4 }}
        >
          {confirmState.loading ? 'Đang xử lý...' : 
           inventoryLoading ? 'Đang tải...' :
           summary.hasStockIssues ? 'Kiểm tra tồn kho' : 'Thanh toán'}
        </Button>
      </Box>

      {/* Global stock warning */}
      {summary.hasStockIssues && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <Typography variant="body1" fontWeight={600}>
            Cảnh báo tồn kho: {summary.stockIssuesCount} sản phẩm có vấn đề về số lượng
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Vui lòng kiểm tra và điều chỉnh số lượng các sản phẩm được đánh dấu màu đỏ trước khi thanh toán.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Form thông tin khách hàng */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Thông tin khách hàng
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box mb={2}>
              <TextField
                fullWidth
                label="Tên khách hàng"
                value={currentExportOrder.customerName}
                onChange={(e) => handleCustomerChange('customerName', e.target.value)}
                placeholder="Nhập tên khách hàng (không bắt buộc)"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box mb={2}>
              <TextField
                fullWidth
                label="Số điện thoại"
                value={currentExportOrder.customerPhone}
                onChange={(e) => handleCustomerChange('customerPhone', e.target.value)}
                placeholder="Nhập số điện thoại"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Box mb={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Phương thức thanh toán</InputLabel>
                <Select
                  value={currentExportOrder.paymentMethod}
                  onChange={handlePaymentMethodChange}
                  label="Phương thức thanh toán"
                  startAdornment={<PaymentIcon fontSize="small" sx={{ mr: 1 }} />}
                >
                  <MenuItem value="cash">💰 Tiền mặt</MenuItem>
                  <MenuItem value="card">💳 Thẻ</MenuItem>
                  <MenuItem value="transfer">🏦 Chuyển khoản</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Ghi chú"
              value={currentExportOrder.notes}
              onChange={handleNotesChange}
              placeholder="Ghi chú thêm..."
              size="small"
            />
          </Paper>

          {/* Tóm tắt */}
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Tóm tắt hóa đơn
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography color="text.secondary">Số sản phẩm:</Typography>
                <Chip 
                  label={summary.totalItems}
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
                  {currentExportOrder.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>Tổng thanh toán:</Typography>
                <Typography variant="h6" fontWeight={600} color="primary.main">
                  {currentExportOrder.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
              </Box>

              <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                Khách hàng: <strong>{currentExportOrder.customerName || 'Khách lẻ'}</strong><br/>
                Thanh toán: <strong>
                  {currentExportOrder.paymentMethod === 'cash' ? 'Tiền mặt' : 
                   currentExportOrder.paymentMethod === 'card' ? 'Thẻ' : 'Chuyển khoản'}
                </strong>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Bảng sản phẩm */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight={600}>
                Giỏ hàng ({summary.totalItems} sản phẩm)
                {summary.hasStockIssues && (
                  <Chip 
                    label={`${summary.stockIssuesCount} vấn đề tồn kho`}
                    color="error"
                    size="small"
                    sx={{ ml: 2 }}
                  />
                )}
              </Typography>
            </Box>
            
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Mã hàng</TableCell>
                    <TableCell>Tên hàng</TableCell>
                    <TableCell align="center">Tồn kho</TableCell>
                    <TableCell align="center">Số lượng</TableCell>
                    <TableCell align="center">Đơn giá</TableCell>
                    <TableCell align="center">Thành tiền</TableCell>
                    <TableCell align="center">Thao tác</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentExportOrder.items.map((item, index) => {
                    const stockCheck = checkStockAvailability(item.productId, item.quantity);
                    const isOverStock = !stockCheck.sufficient;
                    const isLowStock = stockCheck.isLowStock;
                    const isEmpty = stockCheck.isEmpty;
                    
                    return (
                      <TableRow 
                        key={`${item.productId}-${index}`}
                        // sx={{
                        //   backgroundColor: isOverStock || isEmpty ? 'error.light' : 
                        //                  item.quantity <= 0 ? 'warning.light' : 'transparent'
                        // }}
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
                          {isOverStock && (
                            <Typography variant="caption" color="error" display="block">
                              ⚠️ Vượt quá tồn kho
                            </Typography>
                          )}
                          {isEmpty && (
                            <Typography variant="caption" color="error" display="block">
                              ❌ Hết hàng
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stockCheck.available}
                            size="small"
                            color={isEmpty ? 'error' : isLowStock ? 'warning' : 'success'}
                            variant={isOverStock ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                            inputProps={{ 
                              min: 1, 
                              max: stockCheck.available,
                              style: { textAlign: 'center' } 
                            }}
                            size="small"
                            sx={{ width: 80 }}
                            error={item.quantity <= 0 || isOverStock || isEmpty}
                            helperText={
                              isEmpty ? 'Hết hàng' :
                              isOverStock ? `Max: ${stockCheck.available}` : ''
                            }
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">
                            {item.unitPrice.toLocaleString('vi-VN')}đ
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography 
                            fontWeight={600} 
                            color={isOverStock || isEmpty ? 'error.main' : 'success.main'}
                          >
                            {item.totalPrice.toLocaleString('vi-VN')}đ
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title={`Xóa ${item.productName}`}>
                            <IconButton 
                              onClick={() => handleRemoveItem(index)}
                              color="error"
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Footer bảng với cảnh báo tồn kho */}
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tổng cộng: <strong>{summary.totalItems}</strong> sản phẩm, 
                    <strong> {summary.totalQuantity}</strong> số lượng
                  </Typography>
                  
                  {/* Cảnh báo tồn kho */}
                  {summary.hasStockIssues && (
                    <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                      <Typography variant="caption">
                        ⚠️ {summary.stockIssuesCount} sản phẩm có vấn đề về tồn kho. Vui lòng kiểm tra lại số lượng.
                      </Typography>
                    </Alert>
                  )}
                </Grid>
                <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
                  <Typography variant="h6" fontWeight={600} color="primary.main">
                    Thành tiền: {currentExportOrder.totalAmount.toLocaleString('vi-VN')}đ
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog hiển thị hóa đơn */}
      <Dialog 
        open={showReceiptDialog} 
        onClose={handleCloseReceipt} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckCircleIcon color="success" />
            <Typography variant="h6">
              Thanh toán thành công! 🎉
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {completedOrder && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Phiếu xuất hàng <strong>{completedOrder.receiptCode}</strong> đã được tạo thành công
              </Alert>
              
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>📄 Mã phiếu:</strong> {completedOrder.receiptCode}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>💰 Tổng tiền:</strong> {completedOrder.totalAmount.toLocaleString('vi-VN')}đ
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>👤 Khách hàng:</strong> {completedOrder.customerName || 'Khách lẻ'}
                </Typography>
                {completedOrder.customerPhone && (
                  <Typography variant="body1" gutterBottom>
                    <strong>📞 SĐT:</strong> {completedOrder.customerPhone}
                  </Typography>
                )}
                <Typography variant="body1" gutterBottom>
                  <strong>💳 Phương thức:</strong> {
                    completedOrder.paymentMethod === 'cash' ? '💰 Tiền mặt' :
                    completedOrder.paymentMethod === 'card' ? '💳 Thẻ' : '🏦 Chuyển khoản'
                  }
                </Typography>
                <Typography variant="body1">
                  <strong>🕐 Thời gian:</strong> {new Date().toLocaleString('vi-VN')}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleCloseReceipt}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Đóng
          </Button>
          <Button 
            variant="contained" 
            startIcon={<PrintIcon />}
            onClick={handlePrintReceipt}
            sx={{ textTransform: 'none' }}
          >
            In hóa đơn
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

export default ExportOrder;