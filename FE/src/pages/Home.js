import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Typography, Grid } from "@mui/material";
import { jwtDecode } from "jwt-decode";

import ProfilePanel from "../components/LeftPanel.js";
import SearchPanel from "../components/SearchPanel.js";
import PaymentPanel from "../components/PaymentPanel.js";
import Navbar from "../components/Navbar.js";
function Home() {
  const [loggedInStudent, setLoggedInStudent] = useState(null);
  const [searchedStudent, setSearchedStudent] = useState(null);

  // Lấy thông tin sinh viên đăng nhập từ JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Token from localStorage:", token);
    if (!token) return;

    try {
      const decoded = jwtDecode(token);
      console.log("Decoded JWT:", decoded);

      if (decoded.studentId) {
        fetchStudentInfo(decoded.studentId, true);
      }
    } catch (err) {
      console.error("Lỗi khi giải mã token:", err);
    }
  }, []);

  // Gọi API tới user-service để lấy thông tin sinh viên
  const fetchStudentInfo = async (studentId, isLoggedInUser = false) => {
  try {
    const res = await axios.get(
      `http://localhost:2000/api/students/users/${studentId}`
    );
    console.log("Dữ liệu trả về:", res.data);

    // Lấy thông tin học phí
    const tuitionRes = await axios.get(
      `http://localhost:2000/api/tuitions/tuitions/${studentId}`
    );
    
    // Gộp thông tin sinh viên và học phí
    const studentWithTuition = {
      ...res.data,
      tuitionAmount: tuitionRes.data.tuitionAmount,
      tuitionStatus: tuitionRes.data.status,
      dueDate: tuitionRes.data.duedate
    };

    if (isLoggedInUser) {
      setLoggedInStudent(studentWithTuition);
    } else {
      setSearchedStudent(studentWithTuition);
    }
  } catch (err) {
    console.error("Lỗi khi lấy thông tin sinh viên:", err);
    
    // Xử lý lỗi chi tiết hơn
    if (isLoggedInUser) {
      console.error("Không thể tải thông tin người dùng đăng nhập");
      return;
    }

    // Xóa kết quả tìm kiếm trước đó
    setSearchedStudent(null);
    
    // Hiển thị thông báo lỗi chi tiết
    let errorMessage = "Đã xảy ra lỗi khi tìm kiếm thông tin sinh viên.";
    
    if (err.response) {
      switch (err.response.status) {
        case 404:
          errorMessage = `Không tìm thấy sinh viên có MSSV: ${studentId}. Vui lòng kiểm tra lại MSSV.`;
          break;
        case 500:
          errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau.";
          break;
        default:
          errorMessage = err.response.data?.message || "Không thể kết nối đến hệ thống.";
      }
    } else if (err.request) {
      errorMessage = "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
    }
    
    // Truyền lỗi xuống SearchPanel để hiển thị
    setSearchError(errorMessage);
  }
};

// Thêm state cho search error
const [searchError, setSearchError] = useState("");

  // Khi người dùng tìm sinh viên khác bằng MSSV
  const handleSearchStudent = (mssv) => {
    if (mssv.trim()) {
      setSearchError(""); // Xóa lỗi cũ
      fetchStudentInfo(mssv.trim(), false);
    }
  };

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" align="center" sx={{ mb: 4 }}>
          Đóng học phí
        </Typography>

        <Grid container spacing={2} >
          {/* Cột trái: thông tin người đăng nhập */}
          <Grid item xs={4} size={4}>
            <ProfilePanel loggedInStudent={loggedInStudent} />
          </Grid>

          {/* Cột phải: tra cứu & thanh toán */}
          <Grid item xs={8} size={8}>
            <SearchPanel onSearch={handleSearchStudent}
            error={searchError}
             />
            <PaymentPanel 
              searchedStudent={searchedStudent} 
              loggedInStudent={loggedInStudent}
              onUpdateLoggedInStudent={setLoggedInStudent}
              onUpdateSearchedStudent={setSearchedStudent}
            />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default Home;
