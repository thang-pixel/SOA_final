import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notifications: [],
    unreadCount: 0,
    total: 0,
    currentPage: 1,
    totalPages: 0,
    loading: false,
    error: null
  },
  reducers: {
    setNotifications: (state, action) => {
      state.notifications = action.payload.notifications;
      state.total = action.payload.total;
      state.currentPage = action.payload.currentPage;
      state.totalPages = action.payload.totalPages;
      state.unreadCount = action.payload.unreadCount;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    markAsRead: (state, action) => {
      const notification = state.notifications.find(n => n._id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(notification => {
        notification.isRead = true;
      });
      state.unreadCount = 0;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const {
  setNotifications,
  setUnreadCount,
  markAsRead,
  markAllAsRead, 
  setLoading,
  setError
} = notificationSlice.actions;

export default notificationSlice.reducer;