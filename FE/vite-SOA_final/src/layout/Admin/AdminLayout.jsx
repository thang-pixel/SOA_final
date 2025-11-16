import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Breadcrumbs,
  Link,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as ShoppingCartIcon,
  Inventory as InventoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import {logOut} from '../../redux/action/authAction';
import { useDispatch } from 'react-redux';
// Chiều rộng sidebar khi mở và đóng
const drawerWidth = 240;
const drawerClosedWidth = 65;

// Danh sách menu items
const menuItems = [
  { text: 'Trang chủ', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Đơn hàng', icon: <ShoppingCartIcon />, path: '/admin/orders' },
  { text: 'Sản phẩm tồn kho', icon: <InventoryIcon />, path: '/admin/inventory' },
  { text: 'Nhập kho', icon: <AddIcon />, path: '/admin/import' },
  { text: 'Xuất kho', icon: <RemoveIcon />, path: '/admin/export' },
  { text: 'Báo cáo', icon: <AssessmentIcon />, path: '/admin/reports' },
  { text: 'Cài đặt', icon: <SettingsIcon />, path: '/admin/settings' },
];




function AdminLayout() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  // State quản lý sidebar
  const [open, setOpen] = useState(!isMobile);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // State menu người dùng
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Toggle sidebar desktop
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
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
  };
  
  // Lấy tiêu đề trang động
  const getPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.text : 'Quản lý kho';
  };
  
  // Nội dung sidebar
  const drawerContent = (
    <>
      {/* Logo/Header Sidebar */}
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isMobile || open ? 'space-between' : 'center',
          px: [1],
        }}
      >
        {(isMobile || open) && (
          <Typography variant="h6" noWrap component="div">
            Quản lý kho
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      
      <Divider />
      
      {/* Menu items */}
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                minHeight: 48,
                justifyContent: (isMobile || open) ? 'initial' : 'center',
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: (isMobile || open) ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {(isMobile || open) && <ListItemText primary={item.text} />}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );
  
  return (
    <Box sx={{ display: 'flex' }}>
      {/* AppBar - Header */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: isMobile ? '100%' : `calc(100% - ${open ? drawerWidth : drawerClosedWidth}px)`,
          ml: isMobile ? 0 : `${open ? drawerWidth : drawerClosedWidth}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
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
          
          {/* Tiêu đề trang */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>
          
          {/* Icon thông báo */}
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          {/* Avatar và menu người dùng */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
          </IconButton>
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
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
            <MenuItem onClick={() => { handleClose(); navigate('/admin/profile'); }}>
              Thông tin tài khoản
            </MenuItem>
            <MenuItem onClick={handleLogout}>Đăng xuất</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: open ? drawerWidth : drawerClosedWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: open ? drawerWidth : drawerClosedWidth,
              boxSizing: 'border-box',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Sidebar - Mobile (Drawer trượt) */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Nội dung chính */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: isMobile ? '100%' : `calc(100% - ${open ? drawerWidth : drawerClosedWidth}px)`,
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
        }}
      >
        <Toolbar /> {/* Spacer cho AppBar */}
        
       
        
        {/* Nội dung động theo route */}
        <Outlet />
        
        {/* Footer */}
        <Box sx={{ mt: 4, py: 2, textAlign: 'center', borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="body2" color="text.secondary">
            © 2025 Hệ thống quản lý kho. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default AdminLayout;