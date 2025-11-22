import { Box, Typography, Grid, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getActivitySummary } from '../../redux/action/activityAction';

function Dashboard() {
  const dispatch = useDispatch();
  const { stats, recentActivities, loading } = useSelector((state) => state.activity);

  useEffect(() => {
    dispatch(getActivitySummary());
  }, [dispatch]);

  const getActionLabel = (action) => {
    const labels = {
      'login': 'Đăng nhập',
      'logout': 'Đăng xuất',
      'create_product': 'Tạo sản phẩm',
      'update_product': 'Cập nhật sản phẩm',
      'delete_product': 'Xóa sản phẩm',
      'create_import_order': 'Tạo đơn nhập hàng',
      'submit_import_order': 'Gửi đơn nhập hàng',
      'create_warehouse_receipt': 'Tạo phiếu nhập kho',
      'create_export_order': 'Tạo đơn xuất hàng',
      'approve_export_order': 'Phê duyệt đơn xuất',
      'reject_export_order': 'Từ chối đơn xuất',
      'update_user': 'Cập nhật user',
      'delete_user': 'Xóa user',
      'register': 'Đăng ký'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      'login': 'success',
      'logout': 'default',
      'create_product': 'primary',
      'update_product': 'info',
      'delete_product': 'error',
      'create_import_order': 'primary',
      'submit_import_order': 'info',
      'create_warehouse_receipt': 'success',
      'create_export_order': 'warning',
      'approve_export_order': 'success',
      'reject_export_order': 'error',
      'update_user': 'info',
      'delete_user': 'error',
      'register': 'success'
    };
    return colors[action] || 'default';
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return `${diff} giây trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
            <Typography variant="h6" color="primary">Tổng hoạt động hôm nay</Typography>
            <Typography variant="h4">{stats?.totalToday || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
            <Typography variant="h6" color="secondary">Đăng nhập hôm nay</Typography>
            <Typography variant="h4">{stats?.loginToday || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="h6" color="success.main">Nhập kho hôm nay</Typography>
            <Typography variant="h4">{stats?.importsToday || 0}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
            <Typography variant="h6" color="warning.main">Xuất kho hôm nay</Typography>
            <Typography variant="h4">{stats?.exportsToday || 0}</Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Hoạt động gần đây
            </Typography>
            {loading ? (
              <Typography>Đang tải...</Typography>
            ) : recentActivities && recentActivities.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Thời gian</strong></TableCell>
                      <TableCell><strong>Nhân viên</strong></TableCell>
                      <TableCell><strong>Loại hoạt động</strong></TableCell>
                      <TableCell><strong>Mô tả</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities.map((activity, index) => (
                      <TableRow key={index} hover>
                        <TableCell sx={{ minWidth: 150 }}>
                          {formatTime(activity.timestamp)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.username}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={getActionLabel(activity.action)} 
                            color={getActionColor(activity.action)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {activity.description}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">Chưa có hoạt động nào</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;