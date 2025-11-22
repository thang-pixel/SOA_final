import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  logs: [],
  recentActivities: [],
  stats: null,
  total: 0,
  page: 1,
  totalPages: 0,
  loading: false,
  error: null,
};

const activitySlice = createSlice({
  name: 'activity',
  initialState,
  reducers: {
    setActivityLogs: (state, action) => {
      state.logs = action.payload.logs || [];
      state.total = action.payload.total || 0;
      state.page = action.payload.page || 1;
      state.totalPages = action.payload.totalPages || 0;
    },
    setRecentActivities: (state, action) => {
      state.recentActivities = action.payload || [];
    },
    setActivityStats: (state, action) => {
      state.stats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setActivityLogs,
  setRecentActivities,
  setActivityStats,
  setLoading,
  setError,
  clearError,
} = activitySlice.actions;

export default activitySlice.reducer;
