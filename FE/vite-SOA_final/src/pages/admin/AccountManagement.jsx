import React, { useEffect, useState } from 'react';
import { 
  Box, Typography, Paper, Button, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Select, MenuItem, FormControl, InputLabel, Chip 
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import API_DOMAIN from '../../constants/apiDomain';

export default function AccountManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State cho Dialog Sửa/Thêm
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState({ _id: '', username: '', email: '', password: '', role: 'user' });
  const [isEditMode, setIsEditMode] = useState(false);

  // Lấy danh sách user từ API Gateway
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Gọi qua API Gateway (port 2000) -> proxy sang auth-service (port 3001)
      const response = await axios.get(`${API_DOMAIN}/api/auth/users`);
      // DataGrid yêu cầu mỗi hàng phải có 'id', ta map '_id' của MongoDB sang 'id'
      const formattedData = response.data.map(user => ({ ...user, id: user._id }));
      setUsers(formattedData);
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  //  Xử lý Xóa
  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      try {
        await axios.delete(`${API_DOMAIN}/api/auth/users/${id}`);
        // Cập nhật lại giao diện
        setUsers(users.filter((u) => u.id !== id));
      } catch (error) {
        alert('Xóa thất bại');
      }
    }
  };

  //  Mở Dialog Sửa
  const handleEditClick = (user) => {
    setCurrentUser(user);
    setIsEditMode(true);
    setOpenDialog(true);
  };

  // Mở Dialog Thêm mới
  const handleAddClick = () => {
    setCurrentUser({ _id: '', username: '', email: '', password: '', role: 'user' });
    setIsEditMode(false);
    setOpenDialog(true);
  };

  // Lưu thay đổi (Cập nhật hoặc Thêm mới)
  const handleSave = async () => {
    try {
      if (isEditMode) {
        // Cập nhật user
        await axios.put(`${API_DOMAIN}/api/auth/users/${currentUser.id}`, {
          email: currentUser.email,
          role: currentUser.role
        });
      } else {
        // Thêm user mới
        await axios.post(`${API_DOMAIN}/api/auth/register`, {
          username: currentUser.username,
          email: currentUser.email,
          password: currentUser.password,
          role: currentUser.role
        });
      }
      setOpenDialog(false);
      fetchUsers(); // Load lại dữ liệu mới
    } catch (error) {
      alert(isEditMode ? 'Cập nhật thất bại' : 'Thêm tài khoản thất bại');
      console.error(error);
    }
  };

  // Cấu hình cột cho DataGrid
  const columns = [
    { field: 'username', headerName: 'Tên đăng nhập', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { 
      field: 'role', 
      headerName: 'Vai trò', 
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          color={params.value === 'admin' ? 'error' : 'primary'} 
          size="small" 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Hành động',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box>
          <IconButton color="primary" onClick={() => handleEditClick(params.row)}>
            <EditIcon />
          </IconButton>
          <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
            <DeleteIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight={600} color='black'>
          Quản lý tài khoản
        </Typography>
        {/* Nút thêm mới */}
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          sx={{ textTransform: 'none' }}
          onClick={handleAddClick}
        >
          Thêm tài khoản
        </Button>
      </Box>

      <Paper elevation={2} sx={{ height: 'calc(100vh - 250px)', width: '100%', borderRadius: 2 }}>
        <DataGrid
          rows={users}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          checkboxSelection
          disableRowSelectionOnClick
          loading={loading}
          sx={{
            border: 0,
            '& .MuiDataGrid-cell:hover': {
              color: 'primary.main',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.04)',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
            },
          }}
        />
      </Paper>

      {/* Dialog chỉnh sửa thông tin */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {isEditMode ? `Cập nhật tài khoản: ${currentUser.username}` : 'Thêm tài khoản mới'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 400 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!isEditMode && (
              <>
                <TextField
                  label="Tên đăng nhập"
                  fullWidth
                  required
                  value={currentUser.username}
                  onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                />
                <TextField
                  label="Mật khẩu"
                  type="password"
                  fullWidth
                  required
                  value={currentUser.password}
                  onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                />
              </>
            )}
            <TextField
              label="Email"
              fullWidth
              required
              value={currentUser.email}
              onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={currentUser.role}
                label="Vai trò"
                onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditMode ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}