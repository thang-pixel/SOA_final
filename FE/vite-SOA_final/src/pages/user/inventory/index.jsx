import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInventoryItems } from '../../../redux/action/inventory';
import { setSearchFilter, setStockFilter } from '../../../redux/reducers/inventorySlice';
import { createImportOrder, createExportOrder } from '../../../redux/action/orderAction';
import AddProductPopup from '../../../components/AddProductPopup';
import ProductHistoryDialog from '../../../components/ProductHistoryDialog';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
  Alert,
  Stack,
  Fade
} from '@mui/material';

import { useNotification } from '../../../hooks/useNotification';
import NotificationSnackbar from '../../../components/NotificationSnackbar';
import { DataGrid } from '@mui/x-data-grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';

// Memoized components for statistics cards
const StatCard = React.memo(({ title, value, icon, color = "primary" }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between" height="100%">
        <Box>
          <Typography color="text.secondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={600}>
            {value}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" justifyContent="center">
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
));

// Memoized cell renderers
const ImageCell = React.memo(({ src, alt }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
    }}
  >
    <Box
      component="img"
      src={src || '/img/default.png'}
      alt={alt}
      sx={{
        width: 45,
        height: 45,
        objectFit: 'cover',
        borderRadius: 1,
      }}
    />
  </Box>
));

const CategoryChip = React.memo(({ value }) => (
  <Chip 
    label={value || 'Chưa phân loại'} 
    size="small" 
    variant="outlined"
    color="primary"
  />
));

const SupplierChip = React.memo(({ value }) => (
  <Chip 
    label={value || 'Chưa có'} 
    size="small" 
    variant="outlined"
    color="secondary"
    icon={<BusinessIcon fontSize="small" />}
  />
));

const PriceCell = React.memo(({ value, color = "text.primary" }) => (
  <Typography variant="body2" color={color} fontWeight={color === "success.main" ? 600 : 400}>
    {value.toLocaleString('vi-VN')}đ
  </Typography>
));

const StockChip = React.memo(({ stock }) => {
  const { color, icon, variant } = useMemo(() => {
    if (stock === 0) {
      return { color: 'error', icon: <WarningIcon fontSize="small" />, variant: 'filled' };
    } else if (stock <= 10) {
      return { color: 'warning', icon: <TrendingDownIcon fontSize="small" />, variant: 'outlined' };
    }
    return { color: 'success', icon: <TrendingUpIcon fontSize="small" />, variant: 'outlined' };
  }, [stock]);

  return (
    <Chip
      icon={icon}
      label={stock}
      size="small"
      color={color}
      variant={variant}
    />
  );
});

const DateCell = React.memo(({ value }) => {
  const formattedDate = useMemo(() => {
    if (!value) return '';
    
    // Xử lý cả Date object và string
    const date = value instanceof Date ? value : new Date(value);
    
    // Kiểm tra xem date có hợp lệ không
    if (isNaN(date.getTime())) return '';
    
    // Format theo định dạng Việt Nam: dd/mm/yyyy hh:mm
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [value]);

  return (
    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
      {formattedDate}
    </Typography>
  );
});

// Component hiển thị nút actions khi có selection
const SelectionActions = React.memo(({ selectedCount, onExport, onPrintLabels, onImport }) => (
  <Fade in={selectedCount > 0}>
    <Stack direction="row" spacing={2}>
      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
        Đã chọn: <strong>{selectedCount}</strong> sản phẩm
      </Typography>
      <Button
        variant="contained"
        startIcon={<ShoppingCartIcon />}
        onClick={onExport}
        sx={{ textTransform: 'none' }}
        color="success"
      >
        Xuất hàng
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={onPrintLabels}
        sx={{ textTransform: 'none' }}
      >
        In tem mã
      </Button>
      <Button
        variant="outlined"
        startIcon={<ImportIcon />}
        onClick={onImport}
        sx={{ textTransform: 'none' }}
      >
        Nhập hàng
      </Button>
    </Stack>
  </Fade>
));

// Component hiển thị nút actions mặc định
const DefaultActions = React.memo(({ onAddNew, onImport, onExport }) => (
  <Stack direction="row" spacing={2}>
    <Button
      variant="outlined"
      startIcon={<ImportIcon />}
      onClick={onImport}
      sx={{ textTransform: 'none' }}
    >
      Import file
    </Button>
    <Button
      variant="outlined"
      startIcon={<ExportIcon />}
      onClick={onExport}
      sx={{ textTransform: 'none' }}
    >
      Xuất file
    </Button>
    <Button
      variant="contained"
      startIcon={<AddIcon />}
      onClick={onAddNew}
      sx={{ textTransform: 'none' }}
    >
      Thêm sản phẩm
    </Button>
  </Stack>
));

function Inventory() {
  const dispatch = useDispatch();
  const { items, loading, error, filters } = useSelector((state) => state.inventory);
  const [openPopup, setOpenPopup] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectionModel, setSelectionModel] = useState([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const navigate = useNavigate();
  
  // Sử dụng notification hook
  const {
    notification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useNotification();

  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch = 
        item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.code.toLowerCase().includes(filters.search.toLowerCase()) ||
        (item.supplier && item.supplier.toLowerCase().includes(filters.search.toLowerCase()));
      
      let matchStock = true;
      if (filters.stockStatus === 'in-stock') {
        matchStock = item.stock > 0;
      } else if (filters.stockStatus === 'out-of-stock') {
        matchStock = item.stock === 0;
      }

      return matchSearch && matchStock;
    });
  }, [items, filters.search, filters.stockStatus]);

  // Memoized handlers
  const handleSearch = useCallback((e) => {
    dispatch(setSearchFilter(e.target.value));
  }, [dispatch]);

  const handleStockFilter = useCallback((status) => {
    dispatch(setStockFilter(status));
  }, [dispatch]);

  const handleAddSuccess = useCallback(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const handleRowClick = useCallback((params, event) => {
    // Ngăn không cho mở popup khi click vào checkbox
    if (event.target.type === 'checkbox') {
      return;
    }
    setEditingItem(params.row);
    setOpenPopup(true);
  }, []);

  const handleClosePopup = useCallback(() => {
    setOpenPopup(false);
    setEditingItem(null);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingItem(null);
    setOpenPopup(true);
  }, []);

  const handleSelectionChange = useCallback((newSelection) => {
    setSelectionModel(newSelection);
  }, []);

  // Action handlers cho selection - XUẤT HÀNG
  const handleExportSelected = useCallback(() => {
    const selectedItems = filteredItems.filter(item => selectionModel.includes(item._id));
    
    if (selectedItems.length === 0) {
      showWarning('Vui lòng chọn ít nhất một sản phẩm để xuất hàng');
      return;
    }
    
    // Kiểm tra tồn kho
    const outOfStockItems = selectedItems.filter(item => item.stock === 0);
    if (outOfStockItems.length > 0) {
      showError(
        `Không thể xuất hàng! Các sản phẩm sau đã hết hàng: ${outOfStockItems.map(item => item.name).join(', ')}`,
        10000
      );
      return;
    }
    
    dispatch(createExportOrder(selectedItems));
    
    navigate('/user/order-export');
  }, [selectionModel, filteredItems, dispatch, navigate, showWarning, showError, showInfo]);

  const handlePrintLabels = useCallback(() => {
    const selectedItems = filteredItems.filter(item => selectionModel.includes(item._id));
    if (selectedItems.length === 0) {
      showWarning('Vui lòng chọn sản phẩm để in tem mã');
      return;
    }
    
    showInfo(`Đang chuẩn bị in tem mã cho ${selectedItems.length} sản phẩm...`);
    // TODO: Implement print labels functionality
  }, [selectionModel, filteredItems, showWarning, showInfo]);

  // Action handlers cho selection - NHẬP HÀNG
  const handleImportSelected = useCallback(() => {
    const selectedItems = filteredItems.filter(item => selectionModel.includes(item._id));
    
    if (selectedItems.length === 0) {
      showWarning('Vui lòng chọn ít nhất một sản phẩm để nhập hàng');
      return;
    }
    
    dispatch(createImportOrder(selectedItems));
    showInfo(`Đã chọn ${selectedItems.length} sản phẩm để nhập hàng. Chuyển đến trang tạo đơn...`);
    setTimeout(() => navigate('/user/order'), 1000);
  }, [selectionModel, filteredItems, dispatch, navigate, showWarning, showInfo]);

  const handleImport = useCallback(() => {
    showInfo('Tính năng import file đang được phát triển');
    // TODO: Implement import functionality
  }, [showInfo]);

  const handleExport = useCallback(() => {
    showInfo('Tính năng xuất file đang được phát triển');
    // TODO: Implement export functionality
  }, [showInfo]);

  const handleStockClick = useCallback((product, event) => {
    event.stopPropagation();
    setSelectedProduct(product);
    setHistoryDialogOpen(true);
  }, []);

  const handleCloseHistoryDialog = useCallback(() => {
    setHistoryDialogOpen(false);
    setSelectedProduct(null);
  }, []);

  // Memoized statistics
  const statistics = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + item.stock, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.price * item.stock), 0);
    const lowStockItems = items.filter(item => item.stock <= 10).length;
    const outOfStockItems = items.filter(item => item.stock === 0).length;

    return { totalStock, totalValue, lowStockItems, outOfStockItems };
  }, [items]);

  // Memoized columns configuration
  const columns = useMemo(() => [
    {
      field: 'image',
      headerName: 'Ảnh',
      width: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <ImageCell src={params.row.image} alt={params.row.name} />
      ),
      sortable: false,
      filterable: false,
    },
    {
      field: 'code',
      headerName: 'Mã hàng',
      width: 130,
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'name',
      headerName: 'Tên hàng',
      flex: 1,
      minWidth: 180,
      headerAlign: 'center',
    },
    {
      field: 'category',
      headerName: 'Danh mục',
      width: 130,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => <CategoryChip value={params.value} />,
    },
    {
      field: 'supplier',
      headerName: 'Nhà cung cấp',
      width: 150,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => <SupplierChip value={params.value} />,
    },
    {
      field: 'price',
      headerName: 'Giá bán',
      width: 120,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => <PriceCell value={params.value} color="success.main" />,
    },
    {
      field: 'cost',
      headerName: 'Giá vốn',
      width: 120,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => <PriceCell value={params.value} />,
    },
    {
      field: 'stock',
      headerName: 'Tồn kho',
      width: 100,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <Box 
          onClick={(e) => handleStockClick(params.row, e)}
          sx={{ 
            cursor: 'pointer',
            '&:hover': {
              transform: 'scale(1.1)',
              transition: 'transform 0.2s'
            }
          }}
        >
          <StockChip stock={params.value} />
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Ngày tạo',
      width: 140,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => <DateCell value={params.row.createdAt} />,
    },
  ], []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
          <InventoryIcon sx={{ mr: 1, fontSize: 32 }} color="primary" />
          <Typography variant="h4" fontWeight={600} color="text.primary">
            Quản lý hàng tồn kho
          </Typography>
        </Box>
        
        {/* Dynamic Action Buttons */}
        {selectionModel.length > 0 ? (
          <SelectionActions
            selectedCount={selectionModel.length}
            onExport={handleExportSelected}
            onPrintLabels={handlePrintLabels}
            onImport={handleImportSelected}
          />
        ) : (
          <DefaultActions
            onAddNew={handleAddNew}
            onImport={handleImport}
            onExport={handleExport}
          />
        )}
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3} >
        <Grid item xs={12} sm={6} md={3} size={3}>
          <StatCard
            title="Tổng sản phẩm"
            value={items.length}
            icon={<InventoryIcon color="primary" sx={{ fontSize: 48 }} />}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3} size={3}>
          <StatCard
            title="Tổng tồn kho"
            value={statistics.totalStock.toLocaleString()}
            icon={<TrendingUpIcon color="success" sx={{ fontSize: 48 }} />}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3} size={3}>
          <StatCard
            title="Giá trị tồn kho"
            value={`${statistics.totalValue.toLocaleString('vi-VN')}đ`}
            icon={<TrendingUpIcon color="info" sx={{ fontSize: 48 }} />}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3} size={3}>
          <StatCard
            title="Hết hàng"
            value={statistics.outOfStockItems}
            icon={<WarningIcon color="error" sx={{ fontSize: 48 }} />}
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Tìm theo mã hàng, tên sản phẩm, nhà cung cấp..."
              value={filters.search}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái tồn kho</InputLabel>
              <Select
                value={filters.stockStatus}
                onChange={(e) => handleStockFilter(e.target.value)}
                label="Trạng thái tồn kho"
              >
                <MenuItem value="all">Tất cả</MenuItem>
                <MenuItem value="in-stock">Còn hàng</MenuItem>
                <MenuItem value="out-of-stock">Hết hàng</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary">
              Hiển thị: <strong>{filteredItems.length}</strong> sản phẩm
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Data Table */}
      <Paper sx={{ p: 0, borderRadius: 2 }}>
        <DataGrid
          rows={filteredItems}
          columns={columns}
          getRowId={(row) => row._id}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          checkboxSelection
          onRowSelectionModelChange={handleSelectionChange}
          rowSelectionModel={selectionModel}
          onRowClick={handleRowClick}
          sx={{
            border: 0,
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-cell:hover': {
              color: 'primary.main',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
            },
            minHeight: 400,
          }}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* Popup */}
      <AddProductPopup
        isOpen={openPopup}
        onClose={handleClosePopup}
        onSuccess={handleAddSuccess}
        editItem={editingItem}
      />

      {/* Notification Snackbar */}
      <NotificationSnackbar
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
      />

      {/* Product History Dialog */}
      <ProductHistoryDialog
        open={historyDialogOpen}
        onClose={handleCloseHistoryDialog}
        product={selectedProduct}
      />
    </Box>
  );
}

export default React.memo(Inventory);