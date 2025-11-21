import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  Paper
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material';
import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../redux/action/notificationAction';

const NotificationDropdown = () => {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading } = useSelector(state => state.notification);

  const [anchorEl, setAnchorEl] = useState(null);
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
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      dispatch(markNotificationAsRead(notification._id));
    }
  };

  const handleMarkAllRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  const getNotificationIcon = (type) => {
    const iconProps = { fontSize: 'small' };
    switch (type) {
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
        <Paper sx={{ width: 400, maxHeight: 500 }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
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
          </Box>

          {/* Content */}
          <List sx={{ p: 0, maxHeight: 400, overflow: 'auto' }}>
            {loading ? (
              <ListItem>
                <ListItemText primary="Đang tải..." />
              </ListItem>
            ) : notifications.length === 0 ? (
              <ListItem>
                <ListItemText
                  primary="Không có thông báo"
                  secondary="Bạn chưa có thông báo nào"
                />
              </ListItem>
            ) : (
              notifications.slice(0, 10).map((notification) => (
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
                        }
                      }}
                    >
                      <ListItemIcon>
                        {getNotificationIcon(notification.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                              variant="body2"
                              fontWeight={notification.isRead ? 400 : 600}
                              sx={{ flexGrow: 1 }}
                            >
                              {notification.title}
                            </Typography>
                            <Chip
                              size="small"
                              label={notification.type}
                              color={getTypeColor(notification.type)}
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              component="span"
                              display="block"
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              component="span"
                              display="block"
                            >
                              {formatDate(notification.createdAt)}
                            </Typography>
                            {notification.relatedOrderId && (
                              <Typography
                                variant="caption"
                                color="primary.main"
                                component="span"
                                display="block"
                              >
                                Đơn hàng: {notification.relatedOrderId}
                              </Typography>
                            )}
                          </>
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
                onClick={() => {
                  handleClose();
                  // Navigate to full notification page if needed
                }}
                sx={{ textTransform: 'none' }}
              >
                Xem tất cả thông báo
              </Button>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  );
};

export default NotificationDropdown;