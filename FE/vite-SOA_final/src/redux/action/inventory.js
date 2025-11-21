import axios from 'axios';
import { setItems, setLoading, setError } from '../reducers/inventorySlice';
import API_DOMAIN from "../../constants/apiDomain";
import { createImportOrder } from './orderAction';
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
