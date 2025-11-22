import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  reports: [],
  currentReport: null,
  stats: null,
  loading: false,
  error: null
};

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setReports: (state, action) => {
      state.reports = action.payload;
    },
    addReport: (state, action) => {
      state.reports.unshift(action.payload);
    },
    setCurrentReport: (state, action) => {
      state.currentReport = action.payload;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearCurrentReport: (state) => {
      state.currentReport = null;
    }
  }
});

export const {
  setReports,
  addReport,
  setCurrentReport,
  setStats,
  setLoading,
  setError,
  clearCurrentReport
} = reportSlice.actions;

export default reportSlice.reducer;