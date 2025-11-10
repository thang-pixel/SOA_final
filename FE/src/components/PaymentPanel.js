import React, { useState, useEffect } from "react";
import { Box, Paper, Typography, TextField, Button, Alert } from "@mui/material";
import axios from "axios";
import TermsAndConditions from './TermsAndConditions';

function PaymentPanel({ searchedStudent, loggedInStudent, onUpdateLoggedInStudent, onUpdateSearchedStudent }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [transactionId, setTransactionId] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);
  // Reset state khi chuyển sinh viên khác
  useEffect(() => {
    if (searchedStudent) {
      setOtpSent(false);
      setOtp("");
      setMessage("");
      setTransactionId(null);
      setIsVerified(false);
      setLoading(false);
      setTermsAccepted(false);
      setShowTerms(false);
    }
  }, [searchedStudent?.studentId]);

  if (!searchedStudent) return null;

  if (searchedStudent.tuitionStatus === 'paid') {
    return (
      <>
        {/* Thông tin sinh viên */}
        <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: "#f9f9f9" }}>
          <Typography variant="h6" gutterBottom>Kết quả tìm kiếm</Typography>
          <Typography variant="body1"><strong>Họ và tên:</strong> {searchedStudent.fullName}</Typography>
          <Typography variant="body1"><strong>MSSV:</strong> {searchedStudent.studentId}</Typography>
          <Typography variant="body1"><strong>Email:</strong> {searchedStudent.email}</Typography>
          <Typography variant="body1" sx={{ color: 'red', fontWeight: 'bold' }}>
            <strong>Số tiền cần nộp:</strong>
            <span style={{ textDecoration: 'line-through', marginLeft: 4 }}>
              {searchedStudent.tuitionAmount?.toLocaleString('vi-VN')} VNĐ
            </span>
          </Typography>
          <Typography variant="body1">
            <strong>Trạng thái:</strong> 
            <span style={{ color: 'green', fontWeight: 'bold' }}>Đã thanh toán</span>
          </Typography>
        </Paper>

        <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: "#e8f5e8" }}>
          <Typography variant="h6" gutterBottom color="success">
            ✅ Học phí đã được thanh toán.
          </Typography>
          <Typography variant="body1">
            Sinh viên này đã hoàn thành thanh toán học phí. Không cần thực hiện giao dịch mới.
          </Typography>
        </Paper>
      </>
    );
  }

  // Hiển thị điều khoản trước khi gửi OTP
  const handleInitiatePayment = () => {
    setShowTerms(true);
  };

  const handleTermsAccepted = () => {
    setTermsAccepted(true);
    handleSendOTP();
  };

  // Gửi OTP với transaction locking
  const handleSendOTP = async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await axios.post("http://localhost:2000/api/transaction/payments", {
        payerId: loggedInStudent.studentId,
        studentId: searchedStudent.studentId,
        email: loggedInStudent.email,
      });

      setTransactionId(res.data.paymentId);
      setOtpSent(true);
      setMessage(`OTP đã được gửi tới email của bạn.`);
      setOtpTimer(60);
      // Bắt đầu đếm ngược OTP
      if (timerInterval) clearInterval(timerInterval);
        const interval = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(interval);
    } catch (err) {
      console.error("Lỗi tạo giao dịch:", err);
      const errorMsg = err.response?.data?.message || "Không thể tạo giao dịch. Vui lòng thử lại.";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại OTP
  const handleResendOTP = async () => {
    try {
      setLoading(true);
      await axios.post("http://localhost:2000/api/notifications/otp/resend", {
        transactionId: transactionId,
        email: loggedInStudent.email,
      });
      setMessage("OTP mới đã được gửi lại tới email của bạn.");
      setOtpTimer(60);
      if (timerInterval) clearInterval(timerInterval);
        const interval = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerInterval(interval);
    } catch (err) {
      console.error("Lỗi gửi lại OTP:", err);
      setMessage("Không thể gửi lại OTP. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Xác nhận thanh toán
  const handleConfirmPayment = async () => {
    try {
      setLoading(true);

      // 1. Xác thực OTP
      console.log('Verifying OTP...', { transactionId, otp });
      await axios.post("http://localhost:2000/api/notifications/otp/verify", {
        transactionId: transactionId,
        otp: otp,
      });

      setIsVerified(true);
      setMessage("Xác thực OTP thành công! Đang xử lý thanh toán...");

      // 2. Cập nhật trạng thái giao dịch thành completed
      console.log('Updating payment status to completed...', transactionId);
      await axios.put(`http://localhost:2000/api/transaction/payments/${transactionId}/status`, {
        status: "completed",
      });

      setMessage("Đang cập nhật thông tin...");

      // 3. Delay một chút để đảm bảo database đã được cập nhật
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 4. Reload thông tin sinh viên
      console.log('Reloading student information...');
      try {
        const updatedLoggedIn = await axios.get(`http://localhost:2000/api/students/users/${loggedInStudent.studentId}`);
        onUpdateLoggedInStudent(updatedLoggedIn.data);

        const updatedSearched = await axios.get(`http://localhost:2000/api/students/users/${searchedStudent.studentId}`);
        const tuitionRes = await axios.get(`http://localhost:2000/api/tuitions/tuitions/${searchedStudent.studentId}`);
        
        onUpdateSearchedStudent({
          ...updatedSearched.data,
          tuitionAmount: tuitionRes.data.tuitionAmount,
          tuitionStatus: tuitionRes.data.status,
        });
      } catch (reloadError) {
        console.error('Error reloading student info:', reloadError);
        // Không throw error, chỉ log
      }

      setMessage("Thanh toán học phí thành công!");
      
    } catch (err) {
      console.error("Lỗi xác nhận thanh toán:", err);
      
      let errorMsg = "Xác nhận thanh toán thất bại.";
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        console.error('Error status:', err.response.status);
        
        if (err.response.status === 409) {
          errorMsg = err.response.data.message || "Có xung đột trong giao dịch, vui lòng thử lại";
        } else if (err.response.status === 400) {
          errorMsg = err.response.data.message || "Số dư không đủ hoặc dữ liệu không hợp lệ";
        } else if (err.response.status === 500) {
          errorMsg = "Lỗi hệ thống: " + (err.response.data.message || "Vui lòng thử lại sau");
        } else {
          errorMsg = err.response.data.message || errorMsg;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setMessage(errorMsg);
      setIsVerified(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Terms and Conditions Dialog */}
      <TermsAndConditions
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={handleTermsAccepted}
      />

      {/* Thông tin sinh viên */}
      <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: "#f9f9f9" }}>
        <Typography variant="h6" gutterBottom>Kết quả tìm kiếm</Typography>
        <Typography variant="body1"><strong>Họ và tên:</strong> {searchedStudent.fullName}</Typography>
        <Typography variant="body1"><strong>MSSV:</strong> {searchedStudent.studentId}</Typography>
        <Typography variant="body1"><strong>Email:</strong> {searchedStudent.email}</Typography>
        <Typography variant="body1" sx={{ color: 'red', fontWeight: 'bold' }}>
          Số tiền cần nộp: {searchedStudent.tuitionAmount?.toLocaleString('vi-VN')} VNĐ
        </Typography>
        <Typography variant="body1">
          <strong>Trạng thái:</strong> 
          <span style={{ color: 'orange', fontWeight: 'bold' }}>Chưa thanh toán</span>
        </Typography>
      </Paper>

      {/* Xác nhận thanh toán */}
      <Paper elevation={3} sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: "#f1f8e9" }}>
        <Typography variant="h6" gutterBottom>
          Xác nhận thanh toán học phí
        </Typography>

        {/* Thông báo cảnh báo về số dư - chỉ hiển thị khi không đủ tiền */}
        {loggedInStudent.balance < searchedStudent.tuitionAmount && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Số dư hiện tại:</strong> {loggedInStudent.balance?.toLocaleString('vi-VN')} VNĐ<br/>
              <strong>Số tiền cần thanh toán:</strong> {searchedStudent.tuitionAmount?.toLocaleString('vi-VN')} VNĐ<br/>
              <span style={{ color: 'red', fontWeight: 'bold' }}>
                ⚠️ Số dư không đủ để thực hiện giao dịch!
              </span>
            </Typography>
          </Alert>
        )}

        {/* Thông báo */}
        {message && (
          <Alert
            severity={
              message.includes("thành công") || message.includes("đã được gửi")
                ? "success"
                : "warning"
            }
            sx={{ mb: 2 }}
          >
            {message}
          </Alert>
        )}

        {/* Gửi OTP hoặc nhập mã */}
        {!otpSent ? (
          <Button
            variant="contained"
            color="secondary"
            onClick={handleInitiatePayment}
            disabled={loading || loggedInStudent.balance < searchedStudent.tuitionAmount}
          >
            {loading ? "Đang xử lý..." : "Xác nhận giao dịch"}
          </Button>
        ) : (
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Nhập mã OTP"
              variant="outlined"
              size="small"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              sx={{ mr: 2 }}
              disabled={otpTimer === 0}
            />
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirmPayment}
              disabled={loading || isVerified || otpTimer === 0}
            >
              {loading ? "Đang xác minh..." : "Xác nhận lần cuối"}
            </Button>

            {!isVerified && (
              <Button
                variant="text"
                color="secondary"
                onClick={handleResendOTP}
                sx={{ ml: 2 }}
                disabled={otpTimer > 0}
              >
                Gửi lại mã OTP
              </Button>
            )}
            <Typography variant="body2" sx={{ mt: 1, color: otpTimer === 0 ? 'red' : 'inherit' }}>
              {otpTimer > 0
                ? `Mã OTP sẽ hết hiệu lực sau ${otpTimer} giây`
                : "Mã OTP đã hết hiệu lực. Vui lòng ấn gửi lại mã OTP."}
            </Typography>
          </Box>
        )}
      </Paper>
    </>
  );
}

export default PaymentPanel;