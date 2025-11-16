import axios from 'axios'
import { login, logout } from '../reducers/authSlice'
import API_DOMAIN from "../../constants/apiDomain";
export const loginUser = (username, password) => async (dispatch) => {
  try {
    const res = await axios.post(`${API_DOMAIN}/api/auth/login`, { username, password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    // Nếu đăng nhập thành công, lưu token vào store
    dispatch(login({ token: res.data.token, user: res.data.user }))
    // Có thể lưu thêm thông tin user nếu cần
    return { success: true, role: res.data.user.role, message: 'Đăng nhập thành công', token: res.data.token }
  } catch (error) {
    dispatch(logout())
    return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' }
  }
}
export const logOut = () => (dispatch) => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  dispatch(logout())
}