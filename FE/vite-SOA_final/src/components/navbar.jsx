import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Inventory as InventoryIcon,
  ShoppingCart as OrderIcon,
  Assessment as ReportIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Close as CloseIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { logOut } from '../redux/action/authAction';
import NotificationDropdown from './notification';

// Danh sách menu items cho các service
const menuItems = [
  {
    text: 'Quản lý Kho',
    icon: <InventoryIcon />,
    path: '/inventory',
    description: 'Sản phẩm, số lượng, vị trí, hạn sử dụng'
  },
  {
    text: 'Quản lý Đơn hàng',
    icon: <OrderIcon />,
    path: '/order',
    description: 'Phiếu nhập/xuất, đơn hàng'
  },
  {
    text: 'Báo cáo & Phân tích',
    icon: <ReportIcon />,
    path: '/reports',
    description: 'Báo cáo tồn kho, dự đoán nhu cầu'
  },
];

function Navbar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // State quản lý menu
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Toggle mobile drawer
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Mở menu người dùng
  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Đóng menu người dùng
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  // Xử lý logout
  const handleLogout = () => {
    handleClose();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(logOut());
    navigate('/login');
  };
  
  // Xử lý điều hướng
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setMobileOpen(false);
  };
  
  // Kiểm tra active route
  const isActiveRoute = (path) => {
    return location.pathname === path;
  };
  
  // Nội dung drawer cho mobile
  const drawerContent = (
    <Box
      sx={{ width: 280 }}
      role="presentation"
    >
      {/* Header của drawer */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          Hệ thống Quản lý Kho
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider />
      
      {/* Hiển thị role và nút chuyển đổi cho admin */}
      {user && (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Chip 
              label={user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
              color={user.role === 'admin' ? 'error' : 'primary'}
              size="small"
            />
          </Box>
          
          {user.role === 'admin' && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<AdminIcon />}
              onClick={() => handleNavigation('/admin/dashboard')}
              sx={{ mb: 2 }}
            >
              Chế độ quản trị
            </Button>
          )}
        </Box>
      )}
      
      <Divider />
      
      {/* Menu items */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActiveRoute(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.light + '20',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.light + '30',
                  }
                }
              }}
            >
              <ListItemIcon sx={{ color: isActiveRoute(item.path) ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <Box>
                <ListItemText 
                  primary={item.text}
                  secondary={item.description}
                  primaryTypographyProps={{
                    fontWeight: isActiveRoute(item.path) ? 600 : 400,
                    color: isActiveRoute(item.path) ? 'primary.main' : 'inherit'
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.8rem'
                  }}
                />
              </Box>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
  
  return (
    <>
      {/* AppBar chính */}
      <AppBar 
        position="sticky" 
        elevation={1}
        sx={{ 
          backgroundColor: 'white',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between',
            minHeight: { xs: 70, sm: 90 },
         }}>
          {/* Logo và tiêu đề */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Icon menu cho mobile */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InventoryIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                Quản lý Kho
              </Typography>
            </Box>
          </Box>
          
          {/* Menu điều hướng cho desktop */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            {/* Hiển thị nút chuyển đổi cho admin */}
            {user && user.role === 'admin' && (
              <Button
                startIcon={<AdminIcon />}
                onClick={() => navigate('/admin/dashboard')}
                variant="outlined"
                size="small"
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  mr: 2,
                  color: 'error.main',
                  borderColor: 'error.main',
                  '&:hover': {
                    backgroundColor: 'error.light' + '20',
                    borderColor: 'error.dark'
                  }
                }}
              >
                Chế độ quản trị
              </Button>
            )}
            
            {menuItems.map((item) => (
              <Button
                key={item.text}
                startIcon={item.icon}
                onClick={() => handleNavigation(item.path)}
                variant={isActiveRoute(item.path) ? 'contained' : 'text'}
                size="small"
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  minWidth: 120,
                  fontSize: '1rem',
                  '&:hover': {
                    backgroundColor: isActiveRoute(item.path) 
                      ? 'primary.dark' 
                      : 'primary.light' + '20'
                  }
                }}
              >
                {item.text}
              </Button>
            ))}
          </Box>
          
          {/* Phần bên phải: Role badge, Thông báo và Avatar */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Hiển thị role badge */}
            {user && (
              <Chip 
                label={user.role === 'admin' ? 'Admin' : 'User'}
                color={user.role === 'admin' ? 'error' : 'primary'}
                size="small"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              />
            )}
            
            {/* Component thông báo */}
            <NotificationDropdown />
            
            {/* Avatar và menu người dùng */}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
            
            {/* Menu dropdown */}
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >

              {user && user.role === 'admin' && (
                <MenuItem onClick={() => { handleClose(); navigate('/admin/dashboard'); }}>
                  <AdminIcon sx={{ mr: 1 }} />
                  Chế độ quản trị
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout}>
                Đăng xuất
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Drawer cho mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 280,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}

export default Navbar;