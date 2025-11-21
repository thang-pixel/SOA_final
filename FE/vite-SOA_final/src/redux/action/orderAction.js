import axios from 'axios';
import API_DOMAIN from '../../constants/apiDomain';
import {
  setCurrentImportOrder,
  setImportOrders,
  setWarehouseReceipt,
  setWarehouseReceiptCreating,
  setLoading,
  setError,
  clearCurrentImportOrder,
  clearWarehouseReceipt
} from '../reducers/orderSlice';

// Tạo đơn nhập hàng từ các sản phẩm đã chọn
export const createImportOrder = (selectedProducts) => (dispatch) => {
  try {
    const items = selectedProducts.map(product => ({
      productId: product._id,
      productCode: product.code,
      productName: product.name,
      quantity: 0,
      unitPrice: product.cost || 0,
      discount: 0,
      totalPrice: 0
    }));

    const supplier = selectedProducts[0]?.supplier || '';

    const importOrder = {
      items,
      supplier,
      notes: '',
      totalAmount: 0
    };

    dispatch(setCurrentImportOrder(importOrder));
  } catch (error) {
    console.error('Error creating import order:', error);
    dispatch(setError(error.message));
  }
};

// Lưu đơn nhập hàng
export const saveImportOrder = (orderData, createdBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.post(`${API_DOMAIN}/api/order/import/create`, {
      ...orderData,
      createdBy
    });

    dispatch(setError(null));
    return response.data;
  } catch (error) {
    console.error('Error saving import order:', error);
    dispatch(setError(error.response?.data?.message || error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Gửi đơn hàng cho nhà cung cấp xử lý
export const submitImportOrder = (orderData, createdBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    // Lưu đơn hàng trước
    const savedOrder = await dispatch(saveImportOrder(orderData, createdBy));
    
    // Gửi đơn hàng cho nhà cung cấp
    const response = await axios.put(`${API_DOMAIN}/api/order/import/submit/${savedOrder._id}`);

    dispatch(setError(null));
    return response.data;
  } catch (error) {
    console.error('Error submitting import order:', error);
    dispatch(setError(error.response?.data?.message || error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Tạo phiếu nhập kho từ đơn hàng đã giao
export const createWarehouseReceipt = (order) => (dispatch) => {
  try {
    const warehouseReceipt = {
      orderId: order._id,
      items: order.items.map(item => ({
        ...item,
        actualQuantity: item.quantity // Mặc định bằng số lượng đặt hàng
      })),
      warehouseStaff: '',
      isCreating: false
    };
    
    dispatch(setWarehouseReceipt(warehouseReceipt));
  } catch (error) {
    console.error('Error creating warehouse receipt:', error);
    dispatch(setError(error.message));
  }
};

// Hoàn thành phiếu nhập kho
export const completeWarehouseReceipt = (orderId, actualQuantities, warehouseStaff) => async (dispatch) => {
  try {
    dispatch(setWarehouseReceiptCreating(true));
    
    const response = await axios.put(`${API_DOMAIN}/api/order/import/create-receipt/${orderId}`, {
      actualQuantities,
      warehouseStaff
    });

    dispatch(setError(null));
    dispatch(clearWarehouseReceipt());
    return response.data;
  } catch (error) {
    console.error('Error completing warehouse receipt:', error);
    dispatch(setError(error.response?.data?.message || error.message));
    throw error;
  } finally {
    dispatch(setWarehouseReceiptCreating(false));
  }
};

// Lấy danh sách đơn nhập hàng
export const fetchImportOrders = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.get(`${API_DOMAIN}/api/order/import/list`);
    dispatch(setImportOrders(response.data));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching import orders:', error);
    dispatch(setError(error.response?.data?.message || error.message));
  } finally {
    dispatch(setLoading(false));
  }
};