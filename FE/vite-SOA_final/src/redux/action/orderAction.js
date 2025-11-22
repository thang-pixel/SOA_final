import axios from 'axios';
import API_DOMAIN from '../../constants/apiDomain';
import {
  // Import actions
  setCurrentImportOrder,
  setImportOrders,
  clearCurrentImportOrder,
  
  // Export actions
  setCurrentExportOrder,
  setExportOrders,
  setExportStats,
  clearCurrentExportOrder,
  
  // Warehouse actions
  setWarehouseReceipt,
  setWarehouseReceiptCreating,
  clearWarehouseReceipt,
  
  // Shared actions
  setLoading,
  setError,
} from '../reducers/orderSlice';

// ==================== IMPORT ORDER ACTIONS ====================

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

// ==================== EXPORT ORDER ACTIONS ====================

// Tạo phiếu xuất hàng từ các sản phẩm đã chọn
export const createExportOrder = (selectedProducts) => (dispatch) => {
  try {
    const items = selectedProducts.map(product => ({
      productId: product._id,
      productCode: product.code,
      productName: product.name,
      quantity: 1, // Mặc định là 1, có thể điều chỉnh
      unitPrice: product.price,
      totalPrice: product.price
    }));

    const exportOrder = {
      items,
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      notes: '',
      totalAmount: items.reduce((sum, item) => sum + item.totalPrice, 0)
    };

    dispatch(setCurrentExportOrder(exportOrder));
  } catch (error) {
    console.error('Error creating export order:', error);
    dispatch(setError(error.message));
  }
};

// Lưu phiếu xuất hàng
export const saveExportOrder = (orderData, createdBy) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.post(`${API_DOMAIN}/api/order/export/create`, {
      ...orderData,
      createdBy
    });

    // Cập nhật tồn kho cho từng sản phẩm
    for (const item of orderData.items) {
      try {
        await axios.put(`${API_DOMAIN}/api/inventory/product/update-stock/${item.productId}`, {
          quantity: item.quantity,
          operation: 'decrease'
        });
      } catch (error) {
        console.error('Error updating inventory:', error);
      }
    }

    dispatch(setError(null));
    return response.data;
  } catch (error) {
    console.error('Error saving export order:', error);
    dispatch(setError(error.response?.data?.message || error.message));
    throw error;
  } finally {
    dispatch(setLoading(false));
  }
};

// Lấy danh sách phiếu xuất hàng
export const fetchExportOrders = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    
    const response = await axios.get(`${API_DOMAIN}/api/order/export/list`);
    dispatch(setExportOrders(response.data));
    dispatch(setError(null));
  } catch (error) {
    console.error('Error fetching export orders:', error);
    dispatch(setError(error.response?.data?.message || error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

// Lấy thống kê xuất hàng
export const fetchExportStats = (period = 'day') => async (dispatch) => {
  try {
    const response = await axios.get(`${API_DOMAIN}/api/order/export/stats/${period}`);
    dispatch(setExportStats(response.data));
  } catch (error) {
    console.error('Error fetching export stats:', error);
  }
};

// ==================== WAREHOUSE RECEIPT ACTIONS ====================

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