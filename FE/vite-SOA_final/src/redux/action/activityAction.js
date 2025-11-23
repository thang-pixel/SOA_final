import axios from "axios";
import { setActivityLogs, setActivityStats, setRecentActivities, setLoading, setError } from "../reducers/activitySlice";
import { ACTIVITY_DOMAIN } from "../../constants/apiDomain";

// Lấy danh sách activity logs
export const getActivityLogs = (params = {}) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const queryString = new URLSearchParams(params).toString();
    const response = await axios.get(`${ACTIVITY_DOMAIN}/activity/logs?${queryString}`);
    dispatch(setActivityLogs(response.data));
    dispatch(setLoading(false));
    return response.data;
  } catch (error) {
    dispatch(setError(error.response?.data?.message || 'Lỗi khi lấy danh sách hoạt động'));
    dispatch(setLoading(false));
    throw error;
  }
};

// Lấy thống kê tổng hợp cho dashboard
export const getActivitySummary = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${ACTIVITY_DOMAIN}/activity/stats/summary`);
    dispatch(setActivityStats(response.data));
    dispatch(setRecentActivities(response.data.recentActivities));
    dispatch(setLoading(false));
    return response.data;
  } catch (error) {
    dispatch(setError(error.response?.data?.message || 'Lỗi khi lấy thống kê hoạt động'));
    dispatch(setLoading(false));
    throw error;
  }
};

// Lấy thống kê theo ngày
export const getDailyStats = (startDate, endDate) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await axios.get(`${ACTIVITY_DOMAIN}/activity/stats/daily?${params.toString()}`);
    dispatch(setLoading(false));
    return response.data;
  } catch (error) {
    dispatch(setError(error.response?.data?.message || 'Lỗi khi lấy thống kê theo ngày'));
    dispatch(setLoading(false));
    throw error;
  }
};

// Lấy thống kê theo user
export const getUserStats = (startDate, endDate) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await axios.get(`${ACTIVITY_DOMAIN}/activity/stats/by-user?${params.toString()}`);
    dispatch(setLoading(false));
    return response.data;
  } catch (error) {
    dispatch(setError(error.response?.data?.message || 'Lỗi khi lấy thống kê theo user'));
    dispatch(setLoading(false));
    throw error;
  }
};

// Tạo activity log mới (dùng khi cần log từ frontend)
export const createActivityLog = (activityData) => async (dispatch) => {
  try {
    const response = await axios.post(`${ACTIVITY_DOMAIN}/activity/log`, activityData);
    return response.data;
  } catch (error) {
    console.error('Error creating activity log:', error);
    throw error;
  }
};

// Lấy lịch sử nhập/xuất của một sản phẩm cụ thể
export const getProductActivityHistory = (productId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${ACTIVITY_DOMAIN}/activity/logs/product/${productId}`);
    dispatch(setLoading(false));
    return response.data;
  } catch (error) {
    dispatch(setError(error.response?.data?.message || 'Lỗi khi lấy lịch sử sản phẩm'));
    dispatch(setLoading(false));
    throw error;
  }
};

