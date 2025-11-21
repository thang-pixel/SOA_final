import axios from 'axios';
import API_DOMAIN from '../../constants/apiDomain';
import {
  setNotifications,
  setUnreadCount,
  setLoading,
  setError,
  markAsRead,
  markAllAsRead
} from '../reducers/notificationSlice';

// Lấy danh sách notifications
export const fetchNotifications = (page = 1, unreadOnly = false) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.get(`${API_DOMAIN}/api/notification/notifications`, {
      params: { page, unreadOnly }
    });
    
    dispatch(setNotifications(response.data));
    dispatch(setUnreadCount(response.data.unreadCount));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    dispatch(setError(error.response?.data?.message || error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

// Đánh dấu notification đã đọc
export const markNotificationAsRead = (notificationId) => async (dispatch) => {
  try {
    await axios.put(`${API_DOMAIN}/api/notification/notifications/${notificationId}/read`);
    dispatch(markAsRead(notificationId));
    
    // Cập nhật unread count
    dispatch(fetchNotifications(1, false));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Đánh dấu tất cả notifications đã đọc
export const markAllNotificationsAsRead = () => async (dispatch) => {
  try {
    await axios.put(`${API_DOMAIN}/api/notification/notifications/mark-all-read`);
    dispatch(markAllAsRead());
    dispatch(setUnreadCount(0));
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};