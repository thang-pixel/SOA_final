import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AccountBalance, History, Logout } from '@mui/icons-material';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 50%, #0d47a1 100%)',
        boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)'
      }}
    >
      <Toolbar>
        {/* Logo và tên ngân hàng */}
        <AccountBalance sx={{ mr: 2, fontSize: 32 }} />
        <Typography 
          variant="h5" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold',
            letterSpacing: 1
          }}
        >
          TDTU iBanking
        </Typography>

        {/* Navigation items */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            color="inherit"
            onClick={() => navigate('/home')}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 'bold',
              backgroundColor: location.pathname === '/home' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            Đóng học phí
          </Button>
          
          <Button
            color="inherit"
            onClick={() => navigate('/transaction-history')}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 'bold',
              backgroundColor: location.pathname === '/history' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <History sx={{ mr: 1 }} />
            Lịch sử giao dịch
          </Button>

          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              fontWeight: 'bold',
              backgroundColor: 'rgba(244, 67, 54, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(244, 67, 54, 1)',
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease'
              }
            }}
          >
            <Logout sx={{ mr: 1 }} />
            Đăng xuất
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;