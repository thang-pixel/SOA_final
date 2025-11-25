import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  Download,
  Refresh,
  PictureAsPdf,
  Add,
  DateRange,
  Inventory,
  ShoppingCart,
  Receipt,
  AttachMoney
} from '@mui/icons-material';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createReport, fetchReports, fetchStats, downloadReport } from '../../../redux/action/reportAction';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ReportPage = () => {
  const dispatch = useDispatch();
  const { reports, stats, loading, error } = useSelector(state => state.report);
  const { userInfo } = useSelector(state => state.user);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('day');
  const [formData, setFormData] = useState({
    reportType: 'overview',
    period: 'day',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    dispatch(fetchReports());
    dispatch(fetchStats(selectedPeriod));
  }, [dispatch]);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchReports());
    }, 10000); // Refresh mỗi 10 giây
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleRefreshStats = () => {
    dispatch(fetchStats(selectedPeriod));
  };

  const handlePeriodChange = (event) => {
    const period = event.target.value;
    setSelectedPeriod(period);
    dispatch(fetchStats(period));
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      reportType: 'overview',
      period: 'day',
      startDate: '',
      endDate: ''
    });
  };

  const handleCreateReport = async () => {
    try {
      await dispatch(createReport(formData, userInfo?.username || 'thang1'));
      handleCloseDialog();
      // Thông báo sẽ được hiển thị qua notification dropdown
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const handleDownload = async (report) => {
    try {
      await dispatch(downloadReport(report._id, report.reportCode));
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'processing': return 'Đang xử lý';
      case 'pending': return 'Chờ xử lý';
      case 'failed': return 'Thất bại';
      default: return status;
    }
  };

  const getReportTypeLabel = (type) => {
    switch (type) {
      case 'overview': return 'Tổng quan';
      case 'import': return 'Nhập hàng';
      case 'export': return 'Xuất hàng';
      case 'inventory': return 'Tồn kho';
      default: return type;
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'day': return 'Ngày';
      case 'week': return 'Tuần';
      case 'month': return 'Tháng';
      default: return period;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600} color='black'>
          <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} color='primary' />
          Báo cáo & Phân tích
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Kỳ báo cáo</InputLabel>
            <Select
              value={selectedPeriod}
              label="Kỳ báo cáo"
              onChange={handlePeriodChange}
            >
              <MenuItem value="day">Hôm nay</MenuItem>
              <MenuItem value="week">Tuần này</MenuItem>
              <MenuItem value="month">Tháng này</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={handleRefreshStats} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            Tạo báo cáo
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats?.overview && (
        <Grid container spacing={3} mb={3} >
          <Grid size={{ xs: 12, md: 3 }}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Doanh thu
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {formatCurrency(stats.overview.revenue)}
                    </Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  <TrendingUp color="success" fontSize="small" />
                  <Typography variant="caption" color="success.main" ml={0.5}>
                    Lợi nhuận: {formatCurrency(stats.overview.profit)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3} size={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Đơn nhập hàng
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {stats.overview.totalImportOrders}
                    </Typography>
                  </Box>
                  <ShoppingCart sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
                <Typography variant="caption" color="textSecondary" mt={1}>
                  Tổng: {formatCurrency(stats.overview.totalImportAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3} size={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Phiếu xuất hàng
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {stats.overview.totalExportOrders}
                    </Typography>
                  </Box>
                  <Receipt sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
                <Typography variant="caption" color="textSecondary" mt={1}>
                  Tổng: {formatCurrency(stats.overview.totalExportAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3} size={3}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Tồn kho
                    </Typography>
                    <Typography variant="h5" fontWeight={600}>
                      {stats.overview.totalProducts}
                    </Typography>
                  </Box>
                  <Inventory sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
                <Box display="flex" alignItems="center" mt={1}>
                  {stats.overview.lowStockProducts > 0 && (
                    <>
                      <TrendingDown color="error" fontSize="small" />
                      <Typography variant="caption" color="error" ml={0.5}>
                        {stats.overview.lowStockProducts} sắp hết
                      </Typography>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      {stats && (
        <>
          <Grid container spacing={3} mb={3}>
            {/* CỘT 1: BIỂU ĐỒ ĐƯỜNG (Chiếm 8 phần) */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2
                }}
              >
                <Box mb={2}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">
                    Biến động doanh thu
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Thống kê nhập và xuất hàng theo ngày
                  </Typography>
                </Box>



                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={stats.dailyStats} margin={{ top: 10, right: 40, left: 20, bottom: 10 }}>
                    <defs>
                      <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" strokeOpacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }}
                      stroke="#999"
                      tickLine={{ stroke: '#ccc' }}
                      dy={8}
                    />
                    <YAxis
                      tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }}
                      stroke="#999"
                      tickLine={{ stroke: '#ccc' }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #ddd',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        backgroundColor: 'rgba(255,255,255,0.98)'
                      }}
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(date) => new Date(date).toLocaleDateString('vi-VN')}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '15px' }}
                      iconType="line"
                      iconSize={20}
                    />
                    <Line
                      type="monotone"
                      dataKey="importAmount"
                      stroke="#8884d8"
                      strokeWidth={4}
                      dot={{ r: 5, fill: '#8884d8', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                      name="Nhập hàng"
                      fill="url(#colorImport)"
                    />
                    <Line
                      type="monotone"
                      dataKey="exportAmount"
                      stroke="#82ca9d"
                      strokeWidth={4}
                      dot={{ r: 5, fill: '#82ca9d', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                      name="Xuất hàng"
                      fill="url(#colorExport)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* CỘT 2: BIỂU ĐỒ TRÒN (Chiếm 4 phần) */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2
                }}
              >
                <Box mb={2}>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">
                    Tỷ lệ đơn hàng
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phân bố nhập/xuất
                  </Typography>
                </Box>

                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <defs>
                      <filter id="shadow" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
                      </filter>
                    </defs>
                    <Pie
                      data={[
                        { name: 'Nhập hàng', value: stats.overview?.totalImportOrders || 0 },
                        { name: 'Xuất hàng', value: stats.overview?.totalExportOrders || 0 }
                      ]}
                      cx="50%"
                      cy="45%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      cornerRadius={8}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={{
                        stroke: '#999',
                        strokeWidth: 1
                      }}
                      style={{ filter: 'url(#shadow)' }}
                    >
                      {[0, 1].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={3}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: '1px solid #ddd',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        backgroundColor: 'rgba(255,255,255,0.98)',
                        padding: '10px 15px'
                      }}
                      formatter={(value, name) => [`${value} đơn`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={12}
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Top Products */}
          {stats.topExportProducts && stats.topExportProducts.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Top 10 sản phẩm bán chạy
              </Typography>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={stats.topExportProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="productName" angle={-45} textAnchor="end" height={300} />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="quantity" fill="#82ca9d" name="Số lượng" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </>
      )}

      {/* Reports Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Lịch sử báo cáo
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã báo cáo</TableCell>
                <TableCell>Loại báo cáo</TableCell>
                <TableCell>Kỳ báo cáo</TableCell>
                <TableCell>Thời gian</TableCell>
                <TableCell>Người tạo</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="center">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report._id}>
                  <TableCell>{report.reportCode}</TableCell>
                  <TableCell>{getReportTypeLabel(report.reportType)}</TableCell>
                  <TableCell>{getPeriodLabel(report.period)}</TableCell>
                  <TableCell>{formatDate(report.createdAt)}</TableCell>
                  <TableCell>{report.createdBy}</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(report.status)}
                      color={getStatusColor(report.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {report.status === 'completed' ? (
                      <Tooltip title="Tải xuống">
                        <IconButton
                          color="primary"
                          onClick={() => handleDownload(report)}
                        >
                          <Download />
                        </IconButton>
                      </Tooltip>
                    ) : report.status === 'processing' ? (
                      <Tooltip title="Đang xử lý">
                        <LinearProgress sx={{ width: 80 }} />
                      </Tooltip>
                    ) : report.status === 'failed' ? (
                      <Tooltip title={report.errorMessage || 'Lỗi'}>
                        <Typography variant="caption" color="error">
                          Thất bại
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        Chờ xử lý
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create Report Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          <PictureAsPdf sx={{ mr: 1, verticalAlign: 'middle' }} />
          Tạo báo cáo mới
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Loại báo cáo</InputLabel>
              <Select
                value={formData.reportType}
                label="Loại báo cáo"
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
              >
                <MenuItem value="overview">Tổng quan</MenuItem>
                <MenuItem value="import">Nhập hàng</MenuItem>
                <MenuItem value="export">Xuất hàng</MenuItem>
                <MenuItem value="inventory">Tồn kho</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Kỳ báo cáo</InputLabel>
              <Select
                value={formData.period}
                label="Kỳ báo cáo"
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              >
                <MenuItem value="day">Ngày</MenuItem>
                <MenuItem value="week">Tuần</MenuItem>
                <MenuItem value="month">Tháng</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="date"
              label="Từ ngày"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              type="date"
              label="Đến ngày"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleCreateReport}
            disabled={loading}
          >
            Tạo báo cáo
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ReportPage;