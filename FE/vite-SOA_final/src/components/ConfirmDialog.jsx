import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Button,
  Box,
  Typography,
  Avatar
} from '@mui/material';
import {
  Warning as WarningIcon,
  Help as QuestionIcon,
  Error as DangerIcon
} from '@mui/icons-material';

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  type = 'warning', // 'warning' | 'danger' | 'question'
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  loading = false
}) => {
  const getConfig = () => {
    switch (type) {
      case 'danger':
        return {
          color: 'error.main',
          bgcolor: 'transparent',
          icon: <DangerIcon />,
          confirmColor: 'error'
        };
      case 'question':
        return {
          color: 'info.main',
          bgcolor: 'transparent',
          icon: <QuestionIcon />,
          confirmColor: 'primary'
        };
      default:
        return {
          color: 'warning.main',
          bgcolor: 'transparent',
          icon: <WarningIcon />,
          confirmColor: 'warning'
        };
    }
  };

  const config = getConfig();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            sx={{
              bgcolor: config.bgcolor,
              color: config.color,
              width: 48,
              height: 48
            }}
          >
            {config.icon}
          </Avatar>
          <Typography variant="h6" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ fontSize: '1rem', color: 'text.primary' }}>
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={config.confirmColor}
          disabled={loading}
          sx={{ textTransform: 'none', minWidth: 100 }}
        >
          {loading ? 'Đang xử lý...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;