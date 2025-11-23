import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import API_DOMAIN from '../constants/apiDomain';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  IconButton,
  Divider,
  Avatar,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Chip,
  Autocomplete,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Check as CheckIcon,
  AttachMoney as MoneyIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Business as BusinessIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

// Memoized ImageItem component
const ImageItem = React.memo(({ img, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(img);
  }, [img, onSelect]);

  return (
    <ImageListItem
      sx={{
        cursor: 'pointer',
        border: '2px solid',
        borderColor: isSelected ? 'primary.main' : 'transparent',
        borderRadius: 1,
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: 3
        }
      }}
      onClick={handleClick}
    >
      <img
        src={`/img/${img}`}
        alt={img}
        loading="lazy"
        style={{ height: 80, objectFit: 'cover' }}
      />
      {isSelected && (
        <ImageListItemBar
          sx={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          }}
          position="bottom"
          actionIcon={
            <IconButton sx={{ color: 'success.main' }}>
              <CheckIcon />
            </IconButton>
          }
        />
      )}
    </ImageListItem>
  );
});

// Memoized ProfitDisplay component
const ProfitDisplay = React.memo(({ profit }) => {
  const chipProps = useMemo(() => ({
    label: `${profit.toLocaleString('vi-VN')}đ`,
    color: profit > 0 ? "success" : "error",
    size: "small"
  }), [profit]);

  return (
    <Grid item xs={12} sm={4}>
      <Paper sx={{ p: 1.5, bgcolor: 'success.lighter', height: '30%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box textAlign="center">
          <Typography variant="caption" color="text.secondary" display="block">
            Lợi nhuận dự kiến   <Chip {...chipProps} sx={{ mt: 0.5, fontWeight: 600 }} />
          </Typography>
          
        </Box>
      </Paper>
    </Grid>
  );
});

const AddProductPopup = React.memo(({ isOpen, onClose, onSuccess, editItem }) => {
  const user = useSelector((state) => state.auth.user);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    supplier: '', // Thêm trường supplier
    price: 0,
    cost: 0,
    stock: 0,
    minStockThreshold: 10, // Ngưỡng tồn kho tối thiểu
    image: '',
  });
  
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const isEditMode = useMemo(() => !!editItem, [editItem]);

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
    if (isOpen) {
      fetchImages();
      if (editItem) {
        setFormData({
          code: editItem.code || '',
          name: editItem.name || '',
          category: editItem.category || '',
          supplier: editItem.supplier || '', // Thêm supplier
          price: editItem.price || 0,
          cost: editItem.cost || 0,
          stock: editItem.stock || 0,
          minStockThreshold: editItem.minStockThreshold || 10,
          image: editItem.image || '',
        });
        setSelectedImage(editItem.image || '');
      } else {
        // Reset form khi thêm mới
        setFormData({
          code: '',
          name: '',
          category: '',
          supplier: '',
          price: 0,
          cost: 0,
          stock: 0,
          minStockThreshold: 10,
          image: '',
        });
        setSelectedImage('');
      }
    }
  }, [isOpen, editItem]);

  const fetchImages = useCallback(async () => {
    try {
      const response = await axios.get(`${API_DOMAIN}/api/inventory/img`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
      setSnackbar({ open: true, message: 'Lỗi khi tải danh sách ảnh', severity: 'error' });
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSupplierChange = useCallback((event, value) => {
    setFormData(prev => ({ ...prev, supplier: value || '' }));
  }, []);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Kích thước ảnh không được vượt quá 2MB', severity: 'warning' });
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setUploadingImage(true);
      const response = await axios.post(`${API_DOMAIN}/api/inventory/upload-img`, formDataUpload);
      const imagePath = response.data.path;
      setSelectedImage(imagePath);
      setFormData(prev => ({ ...prev, image: imagePath }));
      setSnackbar({ open: true, message: 'Tải ảnh lên thành công', severity: 'success' });
      await fetchImages();
    } catch (error) {
      setSnackbar({ open: true, message: 'Lỗi khi tải ảnh lên', severity: 'error' });
    } finally {
      setUploadingImage(false);
    }
  }, [fetchImages]);

  const handleSelectImage = useCallback((imageName) => {
    const imagePath = `/img/${imageName}`;
    setSelectedImage(imagePath);
    setFormData(prev => ({ ...prev, image: imagePath }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      setSnackbar({ open: true, message: 'Vui lòng nhập mã hàng và tên hàng', severity: 'warning' });
      return;
    }

    try {
      if (isEditMode) {
        await axios.put(`${API_DOMAIN}/api/inventory/product/update/${editItem._id}`, {
          ...formData,
          updatedBy: user?.username || 'admin'
        });
        setSnackbar({ open: true, message: 'Cập nhật sản phẩm thành công!', severity: 'success' });
      } else {
        await axios.post(`${API_DOMAIN}/api/inventory/product/add`, {
          ...formData,
          createdBy: user?.username || 'admin'
        });
        setSnackbar({ open: true, message: 'Thêm sản phẩm thành công!', severity: 'success' });
      }
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1000);
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: 'Lỗi: ' + (error.response?.data?.message || error.message), 
        severity: 'error' 
      });
    }
  }, [formData, isEditMode, editItem, onSuccess]);

  const handleClose = useCallback(() => {
    setFormData({
      code: '',
      name: '',
      category: '',
      supplier: '', // Reset supplier
      price: 0,
      cost: 0,
      stock: 0,
      minStockThreshold: 10,
      image: '',
    });
    setSelectedImage('');
    onClose();
  }, [onClose]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleRemoveImage = useCallback(() => {
    setSelectedImage('');
    setFormData(prev => ({ ...prev, image: '' }));
  }, []);

  // Memoized computed values
  const profit = useMemo(() => formData.price - formData.cost, [formData.price, formData.cost]);

  const dialogTitle = useMemo(() => (
    isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'
  ), [isEditMode]);

  const submitButtonText = useMemo(() => (
    isEditMode ? 'Cập nhật' : 'Thêm mới'
  ), [isEditMode]);

  const submitButtonIcon = useMemo(() => (
    isEditMode ? <CheckIcon /> : <UploadIcon />
  ), [isEditMode]);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            maxHeight: '90vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <InventoryIcon />
            </Avatar>
            <Typography variant="h6" fontWeight={600}>
              {dialogTitle}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>


        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            {/* Thông tin cơ bản */}
            <Box mb={3}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon color="primary" fontSize="small" />
                Thông tin cơ bản
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {/* Hàng 1: Mã hàng và Tên sản phẩm */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Mã hàng"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    required
                    disabled={isEditMode}
                    placeholder="Nhập mã hàng"
                    size="small"
                    helperText={isEditMode ? "Không thể thay đổi mã hàng" : ""}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Tên sản phẩm"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Nhập tên sản phẩm"
                    size="small"
                  />
                </Grid>

                {/* Hàng 2: Danh mục */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Danh mục"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Nhập danh mục sản phẩm"
                    size="small"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Nhà cung cấp - Box riêng */}
            <Box mb={3}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon color="primary" fontSize="small" />
                Thông tin nhà cung cấp
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Autocomplete
                fullWidth
                options={suppliers}
                value={formData.supplier}
                onChange={handleSupplierChange}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Nhà cung cấp"
                    placeholder="Chọn hoặc nhập nhà cung cấp"
                    size="small"
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
                sx={{
                  '& .MuiAutocomplete-inputRoot': {
                    paddingLeft: '8px !important',
                  }
                }}
              />
            </Box>

            {/* Giá cả */}
            <Box mb={3}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon color="primary" fontSize="small" />
                Giá vốn & Giá bán
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Giá vốn"
                    name="cost"
                    type="number"
                    value={formData.cost}
                    onChange={handleInputChange}
                    InputProps={{
                      endAdornment: <Typography variant="body2" color="text.secondary">đ</Typography>,
                    }}
                    inputProps={{ min: 0 }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Giá bán"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    InputProps={{
                      endAdornment: <Typography variant="body2" color="text.secondary">đ</Typography>,
                    }}
                    inputProps={{ min: 0 }}
                    size="small"
                  />
                </Grid>
                <ProfitDisplay profit={profit} />
              </Grid>
            </Box>

            {/* Tồn kho */}
            <Box mb={3}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon color="primary" fontSize="small" />
                Quản lý tồn kho
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số lượng tồn kho"
                    name="stock"
                    type="number"
                    value={formData.stock}
                    onChange={handleInputChange}
                    inputProps={{ min: 0 }}
                    size="small"
                    helperText="Số lượng sản phẩm hiện có trong kho"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Ngưỡng tồn kho tối thiểu"
                    name="minStockThreshold"
                    type="number"
                    value={formData.minStockThreshold}
                    onChange={handleInputChange}
                    inputProps={{ min: 1 }}
                    size="small"
                    helperText="Cảnh báo khi tồn kho dưới ngưỡng này"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: formData.stock < formData.minStockThreshold ? 'warning.main' : 'primary.main',
                        },
                      },
                    }}
                  />
                  {formData.stock < formData.minStockThreshold && (
                    <Chip 
                      icon={<WarningIcon />}
                      label="Tồn kho thấp" 
                      color="warning" 
                      size="small" 
                      sx={{ mt: 0.5 }}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>

            {/* Hình ảnh */}
            <Box>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon color="primary" fontSize="small" />
                Hình ảnh sản phẩm
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {/* Upload Area */}
              <Paper
                sx={{
                  p: 3,
                  mb: 2,
                  border: '2px dashed',
                  borderColor: selectedImage ? 'success.main' : 'divider',
                  bgcolor: selectedImage ? 'success.lighter' : 'background.paper',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.lighter',
                  }
                }}
              >
                {selectedImage ? (
                  <Box position="relative" display="inline-block">
                    <Box
                      component="img"
                      src={selectedImage}
                      alt="Selected"
                      sx={{
                        width: 150,
                        height: 150,
                        objectFit: 'cover',
                        borderRadius: 2,
                        boxShadow: 2
                      }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'error.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'error.dark' }
                      }}
                      onClick={handleRemoveImage}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ) : (
                  <Box>
                    <input
                      accept="image/*"
                      style={{ display: 'none' }}
                      id="image-upload-input"
                      type="file"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    <label htmlFor="image-upload-input">
                      <Box sx={{ cursor: 'pointer' }}>
                        {uploadingImage ? (
                          <CircularProgress size={48} />
                        ) : (
                          <>
                            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                            <Typography variant="body1" fontWeight={600} color="primary">
                              Tải ảnh lên
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Hỗ trợ: JPG, PNG, GIF (tối đa 2MB)
                            </Typography>
                          </>
                        )}
                      </Box>
                    </label>
                  </Box>
                )}
              </Paper>

              {/* Image Gallery */}
              <Typography variant="body2" fontWeight={600} mb={1}>
                Hoặc chọn từ thư viện:
              </Typography>
              <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                <ImageList cols={5} gap={12}>
                  {images.map((img, index) => (
                    <ImageItem
                      key={index}
                      img={img}
                      isSelected={selectedImage === `/img/${img}`}
                      onSelect={handleSelectImage}
                    />
                  ))}
                </ImageList>
              </Paper>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none' }}>
              Hủy bỏ
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              startIcon={submitButtonIcon}
              sx={{ textTransform: 'none' }}
            >
              {submitButtonText}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
});

export default AddProductPopup;