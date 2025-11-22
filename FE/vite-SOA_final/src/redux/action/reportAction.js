import axios from 'axios';
import API_DOMAIN from '../../constants/apiDomain';
import {
  setReports,
  setCurrentReport,
  setStats,
  setLoading,
  setError,
  addReport
} from '../reducers/reportSlice';

// Tạo báo cáo mới
export const createReport = (reportData, createdBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.post(`${API_DOMAIN}/api/report/report/create`, {
      ...reportData,
      createdBy
    });
    
    dispatch(addReport(response.data.report));
    dispatch(setError(null));
    
    return response.data;
  } catch (error) {
    console.error('Error creating report:', error);
    dispatch(setError(error.response?.data?.message || error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Lấy danh sách báo cáo
export const fetchReports = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.get(`${API_DOMAIN}/api/report/report/list`);
    dispatch(setReports(response.data));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching reports:', error);
    dispatch(setError(error.response?.data?.message || error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

// Lấy thống kê real-time
export const fetchStats = (period = 'day') => async (dispatch) => {
  try {
    const response = await axios.get(`${API_DOMAIN}/api/report/report/stats`, {
      params: { period }
    });
    
    dispatch(setStats(response.data));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching stats:', error);
    dispatch(setError(error.response?.data?.message || error.message));
  }
};

// Tải báo cáo
export const downloadReport = (reportId, reportCode) => async () => {
  try {
    const response = await axios.get(
      `${API_DOMAIN}/api/report/report/download/${reportId}`,
      { responseType: 'blob' }
    );
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${reportCode}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading report:', error);
    throw error;
  }
};

// Xử lý thông báo báo cáo hoàn thành
export const handleReportCompletion = (notification) => async (dispatch) => {
  try {
    const { reportId, reportCode, downloadUrl } = notification.metadata;
    
    if (downloadUrl) {
      // Tự động tải file
      await dispatch(downloadReport(reportId, reportCode));
      
      // Refresh danh sách báo cáo
      dispatch(fetchReports());
    }
  } catch (error) {
    console.error('Error handling report completion:', error);
  }
};