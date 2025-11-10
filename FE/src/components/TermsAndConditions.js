
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography, 
  Checkbox, 
  FormControlLabel,
  Box,
  Divider
} from '@mui/material';

function TermsAndConditions({ open, onClose, onAccept }) {
  const [agreed, setAgreed] = useState(false);

  const handleAccept = () => {
    if (agreed) {
      onAccept();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white' }}>
        Điều khoản và Điều kiện Giao dịch
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          1. Điều khoản thanh toán học phí
        </Typography>
        <Typography variant="body2" paragraph>
          • Bạn xác nhận rằng việc thanh toán học phí là chính xác và không thể hoàn lại.
          • Số tiền sẽ được trừ trực tiếp từ tài khoản của bạn sau khi xác thực OTP.
          • Giao dịch có thể mất 1-5 phút để hoàn tất.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          2. Bảo mật và An toàn
        </Typography>
        <Typography variant="body2" paragraph>
          • Mã OTP chỉ có hiệu lực trong 5 phút và chỉ sử dụng một lần.
          • Không chia sẻ mã OTP với bất kỳ ai khác.
          • Hệ thống sử dụng cơ chế khóa giao dịch để tránh xung đột.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          3. Xử lý Xung đột Giao dịch
        </Typography>
        <Typography variant="body2" paragraph>
          • Hệ thống đảm bảo chỉ một giao dịch được thực hiện tại một thời điểm trên mỗi tài khoản.
          • Trong trường hợp nhiều người cùng thanh toán cho một MSSV, giao dịch đầu tiên sẽ được ưu tiên.
          • Các giao dịch xung đột sẽ được từ chối tự động.
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" gutterBottom>
          4. Trách nhiệm của Người dùng
        </Typography>
        <Typography variant="body2" paragraph>
          • Đảm bảo thông tin MSSV và số tiền chính xác trước khi xác nhận.
          • Kiểm tra số dư tài khoản đủ để thực hiện giao dịch.
          • Liên hệ bộ phận hỗ trợ nếu gặp vấn đề với giao dịch.
        </Typography>

        <Box sx={{ mt: 3, bgcolor: '#fff3cd', p: 2, borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#856404' }}>
            ⚠️ Lưu ý quan trọng: Sau khi xác nhận OTP, giao dịch không thể hủy bỏ. 
            Vui lòng kiểm tra kỹ thông tin trước khi tiếp tục.
          </Typography>
        </Box>

        <FormControlLabel
          control={
            <Checkbox 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)}
              color="primary"
            />
          }
          label="Tôi đã đọc và đồng ý với các điều khoản và điều kiện trên"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Hủy bỏ
        </Button>
        <Button 
          onClick={handleAccept} 
          variant="contained" 
          disabled={!agreed}
          color="primary"
        >
          Đồng ý và Tiếp tục
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TermsAndConditions;