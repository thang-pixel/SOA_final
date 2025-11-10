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

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:2000/api/auth/login', {
                username,
                password,
            });
            setMessage(response.data.message);
            localStorage.setItem('token', response.data.token);
            navigate('/home');
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
                    py: 9,
                    px: 4,
                    borderRadius: 2,
                }}
            >
                <Typography component="h1" variant="h5">
                    Đăng Nhập
                </Typography>
                <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Tài khoản"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoFocus
                    />
                    <TextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Mật khẩu"
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Login
                    </Button>
                    {message && (
                        <Alert severity={message.includes('successful') ? 'success' : 'error'}>
                            {message}
                        </Alert>
                    )}
                    <Button
                        fullWidth
                        variant="text"
                        color="secondary"
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/register')}
                    >
                        Chưa có tài khoản? Đăng ký
                    </Button>
                </Box>

            </Box>
        </Container>
    );
}

export default Login;