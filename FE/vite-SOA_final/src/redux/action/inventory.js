import axios from 'axios';
import { setItems, setLoading, setError } from '../reducers/inventorySlice';
import API_DOMAIN from "../../constants/apiDomain";

export const fetchInventoryItems = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${API_DOMAIN}/api/inventory/product/getAll`);
    // Đảm bảo luôn là mảng
    const data = Array.isArray(response.data) ? response.data : [];
    dispatch(setItems(data));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    dispatch(setError(error.response?.data?.message || 'Lỗi khi tải dữ liệu'));
  } finally {
    dispatch(setLoading(false));
  }
};



// Lấy lịch sử xuất nhập kho của sản phẩm
export const fetchProductHistory = (productId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await axios.get(`${API_DOMAIN}/api/inventory/product/history/${productId}`);
    dispatch(setError(null));
    return response.data;
  } catch (error) {
    console.error('Error fetching product history:', error);
    const errorMessage = error.response?.data?.message || 'Lỗi khi tải lịch sử sản phẩm';
    dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  } finally {
    dispatch(setLoading(false));
  }
};

// Xóa sản phẩm đơn lẻ
export const deleteProduct = (productId, deletedBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.delete(`${API_DOMAIN}/api/inventory/product/delete/${productId}`, {
      data: { deletedBy }
    });
    
    // Reload lại danh sách sau khi xóa
    dispatch(fetchInventoryItems());
    dispatch(setError(null));
    
    return response.data;
  } catch (error) {
    console.error('Error deleting product:', error);
    const errorMessage = error.response?.data?.message || 'Lỗi khi xóa sản phẩm';
    dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  } finally {
    dispatch(setLoading(false));
  }
};

// Xóa nhiều sản phẩm
export const deleteMultipleProducts = (productIds, deletedBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.delete(`${API_DOMAIN}/api/inventory/product/delete-multiple`, {
      data: { productIds, deletedBy }
    });
    
    // Reload lại danh sách sau khi xóa
    dispatch(fetchInventoryItems());
    dispatch(setError(null));
    
    return response.data;
  } catch (error) {
    console.error('Error deleting multiple products:', error);
    const errorMessage = error.response?.data?.message || 'Lỗi khi xóa sản phẩm';
    dispatch(setError(errorMessage));
    throw new Error(errorMessage);
  } finally {
    dispatch(setLoading(false));
  }
};