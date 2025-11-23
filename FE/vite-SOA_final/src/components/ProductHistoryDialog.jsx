import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getProductActivityHistory } from '../redux/action/activityAction';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar
} from '@mui/material';
import {
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const ProductHistoryDialog = ({ open, onClose, product }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => {
    if (open && product?._id) {
      fetchHistory();
    }
  }, [open, product]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dispatch(getProductActivityHistory(product._id));
      setHistoryData(data);
    } catch (err) {
      setError('Không thể tải lịch sử sản phẩm');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionConfig = (action) => {
    const configs = {
      create_import_order: {
        label: 'Tạo đơn nhập',
        icon: <ImportIcon />,
        color: 'info',
        bgColor: '#e3f2fd'
      },
      submit_import_order: {
        label: 'Gửi đơn nhập',
        icon: <CheckCircleIcon />,
        color: 'primary',
        bgColor: '#e8eaf6'
      },
      create_warehouse_receipt: {
        label: 'Nhập kho',
        icon: <TrendingUpIcon />,
        color: 'success',
        bgColor: '#e8f5e9'
      },
      create_export_order: {
        label: 'Tạo đơn xuất',
        icon: <ExportIcon />,
        color: 'warning',
        bgColor: '#fff3e0'
      },
      approve_export_order: {
        label: 'Xuất kho',
        icon: <TrendingDownIcon />,
        color: 'error',
        bgColor: '#ffebee'
      },
      update_product: {
        label: 'Cập nhật',
        icon: <EditIcon />,
        color: 'default',
        bgColor: '#f5f5f5'
      }
    };
    return configs[action] || configs.update_product;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight={600}>
            Lịch sử nhập xuất
          </Typography>
          {product && (
            <Chip 
              label={product.code} 
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
        {product && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {product.name}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : historyData?.logs?.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="text.secondary">
              Chưa có lịch sử nhập xuất
            </Typography>
          </Box>
        ) : (
          <>
            {/* Thống kê tổng hợp */}
            {historyData?.stats && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
                <Stack direction="row" spacing={3} justifyContent="center">
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main" fontWeight={600}>
                      {historyData.stats.totalImports}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lần nhập
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box textAlign="center">
                    <Typography variant="h4" color="error.main" fontWeight={600}>
                      {historyData.stats.totalExports}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lần xuất
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary.main" fontWeight={600}>
                      {historyData.stats.totalUpdates}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lần sửa
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}

            {/* Danh sách lịch sử */}
            <List sx={{ width: '100%' }}>
              {historyData?.logs?.map((log, index) => {
                const config = getActionConfig(log.action);
                return (
                  <React.Fragment key={log._id}>
                    <ListItem 
                      alignItems="flex-start"
                      sx={{
                        bgcolor: config.bgColor,
                        borderRadius: 2,
                        mb: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          boxShadow: 2
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: `${config.color}.main`,
                            width: 48,
                            height: 48
                          }}
                        >
                          {config.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {config.label}
                            </Typography>
                            <Chip 
                              label={formatDate(log.timestamp)} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {log.description}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">
                                Bởi: <strong>{log.username}</strong>
                              </Typography>
                              {log.metadata?.quantity && (
                                <Chip
                                  size="small"
                                  label={`SL: ${log.metadata.quantity}`}
                                  variant="outlined"
                                  color={config.color}
                                />
                              )}
                            </Stack>
                          </Box>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductHistoryDialog;
