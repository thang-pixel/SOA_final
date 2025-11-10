import React, { useState } from 'react';
import axios from 'axios';
import {
    Container,
    TextField,
    Button,
    Typography,
    Box,
    Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

function Register() {
    const [form, setForm] = useState({
        studentId: '',
        username: '',
        password: '',
        email: '',
        fullName: '',
        phone: '',
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('http://localhost:2000/api/auth/register', form);
            setMessage(res.data.message);
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error occurred');
        }
    };

    return (
        <Container maxWidth="xs"
            sx={{
                display: 'flex',
                height: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    border: '1px solid #ccc',
                    py: 7,
                    px: 4,
                    borderRadius: 2,
                }}
            >
                <Typography component="h1" variant="h5">
                    Đăng Ký Tài Khoản
                </Typography>
                <Box component="form" onSubmit={handleRegister} sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Mã sinh viên"
                        name="studentId"
                        value={form.studentId}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Họ tên"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Số điện thoại"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Tên đăng nhập"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        label="Mật khẩu"
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Đăng ký
                    </Button>
                    {message && (
                        <Alert severity={message.includes('thành công') ? 'success' : 'error'}>
                            {message}
                        </Alert>
                    )}
                </Box>
                <Button onClick={() => navigate('/login')} sx={{ mt: 2 }}>
                    Đã có tài khoản? Đăng nhập
                </Button>
            </Box>
        </Container>
    );
}

export default Register;