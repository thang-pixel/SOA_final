import { Outlet } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import Navbar from '../../components/navbar';

function UserLayout() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Navbar cố định ở trên */}
      <Navbar />
      
      {/* Nội dung chính */}
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Outlet để render các trang con */}
          <Outlet />
        </Container>
      </Box>
      
      {/* Footer đơn giản */}
      <Box 
        component="footer" 
        sx={{ 
          mt: 'auto', 
          py: 2, 
          textAlign: 'center',
          backgroundColor: 'white',
          borderTop: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            © 2025 Hệ thống Quản lý Kho. Phát triển bởi SOA Team.
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default UserLayout;