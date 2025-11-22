import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  MarkEmailRead as MarkReadIcon,
  ShoppingCart as ImportIcon,
  Receipt as ExportIcon,
  Inventory as WarehouseIcon,
  Business as SupplierIcon,
  Person as CustomerIcon,
  PictureAsPdf as ReportIcon,
  Download as DownloadIcon,
  Assessment as AnalyticsIcon
} from '@mui/icons-material';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../redux/action/notificationAction';
import { handleReportCompletion } from '../redux/action/reportAction';

const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { notifications, unreadCount, loading } = useSelector(state => state.notification);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0); // 0: Tất cả, 1: Nhập hàng, 2: Xuất hàng, 3: Báo cáo
  const open = Boolean(anchorEl);

  useEffect(() => {
    dispatch(fetchNotifications());
    const interval = setInterval(() => {
      dispatch(fetchNotifications());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    if (unreadCount > 0) {
      dispatch(fetchNotifications());
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedTab(0); // Reset về tab đầu tiên
  };

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      dispatch(markNotificationAsRead(notification._id));
    }

    // Xử lý notification báo cáo
    if (notification.metadata?.type === 'report_completed') {
      dispatch(handleReportCompletion(notification));
      handleClose();
      return;
    }

    // Navigate based on notification type
    if (notification.metadata) {
      const { type, receiptCode, orderCode } = notification.metadata;
      
      if (type === 'export' && receiptCode) {
        handleClose();
        navigate(`/order?filter=export&search=${receiptCode}`);
      } else if (orderCode) {
        handleClose();
        navigate(`/order?filter=import&search=${orderCode}`);
      }
    }
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  const handleViewAllNotifications = () => {
    handleClose();
    navigate('/user/notifications');
  };

  // Lọc notifications theo tab
  const filteredNotifications = React.useMemo(() => {
    let filtered = notifications;

    if (selectedTab === 1) {
      // Chỉ notifications liên quan đến nhập hàng
      filtered = notifications.filter(notification => {
        const metadata = notification.metadata || {};
        return metadata.type !== 'export' && metadata.type !== 'report_completed' && (
          notification.title.toLowerCase().includes('nhập') ||
          notification.title.toLowerCase().includes('cung cấp') ||
          notification.message.toLowerCase().includes('nhập') ||
          metadata.action === 'confirmed' ||
          metadata.action === 'rejected' ||
          metadata.action === 'create_warehouse_receipt'
        );
      });
    } else if (selectedTab === 2) {
      // Chỉ notifications liên quan đến xuất hàng
      filtered = notifications.filter(notification => {
        const metadata = notification.metadata || {};
        return metadata.type === 'export' || 
               notification.title.toLowerCase().includes('xuất') ||
               notification.message.toLowerCase().includes('xuất');
      });
    } else if (selectedTab === 3) {
      // Chỉ notifications liên quan đến báo cáo
      filtered = notifications.filter(notification => {
        const metadata = notification.metadata || {};
        return metadata.type === 'report_completed' ||
               notification.title.toLowerCase().includes('báo cáo') ||
               notification.message.toLowerCase().includes('báo cáo');
      });
    }

    return filtered;
  }, [notifications, selectedTab]);

  const getNotificationIcon = (notification) => {
    const iconProps = { fontSize: 'small' };
    const metadata = notification.metadata || {};

    // Icon cho báo cáo
    if (metadata.type === 'report_completed') {
      return <ReportIcon {...iconProps} sx={{ color: 'success.main' }} />;
    }

    // Icon dựa trên loại hoạt động
    if (metadata.type === 'export') {
      return <ExportIcon {...iconProps} sx={{ color: 'success.main' }} />;
    }
    
    if (metadata.action === 'create_warehouse_receipt') {
      return <WarehouseIcon {...iconProps} sx={{ color: 'info.main' }} />;
    }

    if (notification.title.toLowerCase().includes('cung cấp')) {
      return <SupplierIcon {...iconProps} sx={{ color: 'primary.main' }} />;
    }

    if (notification.title.toLowerCase().includes('nhập')) {
      return <ImportIcon {...iconProps} sx={{ color: 'primary.main' }} />;
    }

    // Icon mặc định theo type
    switch (notification.type) {
      case 'success':
        return <SuccessIcon {...iconProps} sx={{ color: 'success.main' }} />;
      case 'warning':
        return <WarningIcon {...iconProps} sx={{ color: 'warning.main' }} />;
      case 'error':
        return <ErrorIcon {...iconProps} sx={{ color: 'error.main' }} />;
      default:
        return <InfoIcon {...iconProps} sx={{ color: 'info.main' }} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getActivityLabel = (notification) => {
    const metadata = notification.metadata || {};
    
    if (metadata.type === 'report_completed') {
      return 'Báo cáo';
    }
    
    if (metadata.type === 'export') {
      return 'Xuất hàng';
    }
    
    if (metadata.action === 'create_warehouse_receipt') {
      return 'Nhập kho';
    }
    
    if (notification.title.toLowerCase().includes('cung cấp')) {
      return 'Nhà cung cấp';
    }
    
    if (notification.title.toLowerCase().includes('nhập')) {
      return 'Nhập hàng';
    }
    
    return notification.type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  // Tính số lượng notifications theo loại
  const notificationCounts = React.useMemo(() => {
    const counts = { all: notifications.length, import: 0, export: 0, report: 0 };
    
    notifications.forEach(notification => {
      const metadata = notification.metadata || {};
      if (metadata.type === 'export') {
        counts.export++;
      } else if (metadata.type === 'report_completed') {
        counts.report++;
      } else {
        counts.import++;
      }
    });
    
    return counts;
  }, [notifications]);

  const renderReportNotification = (notification) => {
    const metadata = notification.metadata || {};
    const reportTypeName = {
      overview: 'Tổng quan',
      import: 'Nhập hàng',
      export: 'Xuất hàng',
      inventory: 'Tồn kho'
    }[metadata.reportType] || metadata.reportType;

    return (
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          component="div"
          sx={{ mb: 0.5 }}
        >
          {notification.message}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" color="text.disabled">
            {formatDate(notification.createdAt)}
          </Typography>
          
          <Box display="flex" gap={0.5}>
            <Chip
              size="small"
              label={reportTypeName}
              color="primary"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
            <Chip
              size="small"
              label={metadata.period}
              color="secondary"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 20 }}
            />
          </Box>
        </Box>

        {metadata.downloadUrl && (
          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
            <DownloadIcon fontSize="small" color="success" />
            <Typography variant="caption" color="success.main">
              File đã sẵn sàng tải về
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Paper sx={{ width: 480, maxHeight: 650 }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={600}>
                Thông báo
              </Typography>
              {unreadCount > 0 && (
                <Button
                  size="small"
                  startIcon={<MarkReadIcon />}
                  onClick={handleMarkAllRead}
                  sx={{ textTransform: 'none' }}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
              )}
            </Box>
            {unreadCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                {unreadCount} thông báo chưa đọc
              </Typography>
            )}

            {/* Tabs */}
            <Tabs 
              value={selectedTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              sx={{ mt: 1, minHeight: 40 }}
            >
              <Tab 
                label={`Tất cả (${notificationCounts.all})`} 
                sx={{ minHeight: 40, textTransform: 'none', fontSize: '0.75rem' }}
              />
              <Tab 
                label={`Nhập (${notificationCounts.import})`}
                icon={<ImportIcon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 40, textTransform: 'none', fontSize: '0.75rem' }}
              />
              <Tab 
                label={`Xuất (${notificationCounts.export})`}
                icon={<ExportIcon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 40, textTransform: 'none', fontSize: '0.75rem' }}
              />
              <Tab 
                label={`Báo cáo (${notificationCounts.report})`}
                icon={<AnalyticsIcon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 40, textTransform: 'none', fontSize: '0.75rem' }}
              />
            </Tabs>
          </Box>

          {/* Content */}
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {loading ? (
              <ListItem>
                <ListItemText primary="Đang tải..." />
              </ListItem>
            ) : filteredNotifications.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="Không có thông báo"
                  secondary={
                    selectedTab === 0 ? "Bạn chưa có thông báo nào" :
                    selectedTab === 1 ? "Không có thông báo nhập hàng" :
                    selectedTab === 2 ? "Không có thông báo xuất hàng" :
                    "Không có thông báo báo cáo"
                  }
                />
              </ListItem>
            ) : (
              filteredNotifications.slice(0, 10).map((notification) => (
                <React.Fragment key={notification._id}>
                  <ListItem
                    disablePadding
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover'
                    }}
                  >
                    <ListItemButton 
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.selected'
                        },
                        py: 1.5
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: notification.isRead ? 'grey.200' : 'primary.light'
                          }}
                        >
                          {getNotificationIcon(notification)}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Typography
                              variant="body2"
                              fontWeight={notification.isRead ? 400 : 600}
                              sx={{ flexGrow: 1 }}
                            >
                              {notification.title}
                            </Typography>
                            <Chip
                              size="small"
                              label={getActivityLabel(notification)}
                              color={getTypeColor(notification.type)}
                              variant={notification.isRead ? "outlined" : "filled"}
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                        }
                        secondary={
                          notification.metadata?.type === 'report_completed' ? 
                            renderReportNotification(notification) : (
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  component="div"
                                  sx={{ mb: 0.5 }}
                                >
                                  {notification.message}
                                </Typography>
                                
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography
                                    variant="caption"
                                    color="text.disabled"
                                    component="span"
                                  >
                                    {formatDate(notification.createdAt)}
                                  </Typography>
                                  
                                  {notification.relatedOrderId && (
                                    <Chip
                                      size="small"
                                      label={notification.relatedOrderId}
                                      variant="outlined"
                                      color="primary"
                                      sx={{ fontSize: '0.7rem', height: 20 }}
                                    />
                                  )}
                                </Box>

                                {/* Hiển thị thông tin bổ sung cho export orders */}
                                {notification.metadata?.type === 'export' && notification.metadata?.totalAmount && (
                                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                    <CustomerIcon fontSize="small" color="action" />
                                    <Typography variant="caption" color="text.secondary">
                                      {notification.metadata.customerName || 'Khách lẻ'} - {notification.metadata.totalAmount.toLocaleString('vi-VN')}đ
                                    </Typography>
                                  </Box>
                                )}

                                {/* Hiển thị thông tin bổ sung cho import orders */}
                                {notification.metadata?.supplier && notification.metadata?.type !== 'export' && (
                                  <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                    <SupplierIcon fontSize="small" color="action" />
                                    <Typography variant="caption" color="text.secondary">
                                      {notification.metadata.supplier}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            )
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>

          {/* Footer */}
          {notifications.length > 10 && (
            <Box sx={{ p: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="text"
                onClick={handleViewAllNotifications}
                sx={{ textTransform: 'none' }}
              >
                Xem tất cả thông báo ({notifications.length})
              </Button>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  );
};

export default NotificationDropdown;