import { createSlice } from '@reduxjs/toolkit';

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    // Import Order State
    currentImportOrder: {
      items: [],
      supplier: '',
      notes: '',
      totalAmount: 0
    },
    importOrders: [],
    
    // Export Order State  
    currentExportOrder: {
      items: [],
      customerName: '',
      customerPhone: '',
      paymentMethod: 'cash',
      notes: '',
      totalAmount: 0
    },
    exportOrders: [],
    exportStats: {
      totalOrders: 0,
      totalRevenue: 0,
      totalItems: 0
    },
    
    // Shared State
    loading: false,
    error: null,
    
    // Warehouse receipt
    warehouseReceipt: {
      orderId: null,
      items: [],
      warehouseStaff: '',
      isCreating: false
    }
  },
  reducers: {
    // Import order actions
    setCurrentImportOrder: (state, action) => {
      state.currentImportOrder = action.payload;
    },
    addImportItem: (state, action) => {
      state.currentImportOrder.items.push(action.payload);
      state.currentImportOrder.totalAmount = state.currentImportOrder.items.reduce(
        (sum, item) => sum + item.totalPrice, 0
      );
    },
    updateImportItem: (state, action) => {
      const { index, item } = action.payload;
      state.currentImportOrder.items[index] = item;
      state.currentImportOrder.totalAmount = state.currentImportOrder.items.reduce(
        (sum, item) => sum + item.totalPrice, 0
      );
    },
    removeImportItem: (state, action) => {
      state.currentImportOrder.items.splice(action.payload, 1);
      state.currentImportOrder.totalAmount = state.currentImportOrder.items.reduce(
        (sum, item) => sum + item.totalPrice, 0
      );
    },
    setImportSupplier: (state, action) => {
      state.currentImportOrder.supplier = action.payload;
    },
    setImportNotes: (state, action) => {
      state.currentImportOrder.notes = action.payload;
    },
    clearCurrentImportOrder: (state) => {
      state.currentImportOrder = {
        items: [],
        supplier: '',
        notes: '',
        totalAmount: 0
      };
    },
    setImportOrders: (state, action) => {
      state.importOrders = action.payload;
    },

    // Export order actions
    setCurrentExportOrder: (state, action) => {
      state.currentExportOrder = action.payload;
    },
    updateExportItem: (state, action) => {
      const { index, item } = action.payload;
      state.currentExportOrder.items[index] = item;
      
      // Tính lại tổng tiền
      state.currentExportOrder.totalAmount = state.currentExportOrder.items.reduce(
        (sum, item) => sum + item.totalPrice, 0
      );
    },
    removeExportItem: (state, action) => {
      const index = action.payload;
      state.currentExportOrder.items.splice(index, 1);
      
      // Tính lại tổng tiền
      state.currentExportOrder.totalAmount = state.currentExportOrder.items.reduce(
        (sum, item) => sum + item.totalPrice, 0
      );
    },
    setExportCustomer: (state, action) => {
      const { customerName, customerPhone } = action.payload;
      state.currentExportOrder.customerName = customerName;
      state.currentExportOrder.customerPhone = customerPhone;
    },
    setExportPaymentMethod: (state, action) => {
      state.currentExportOrder.paymentMethod = action.payload;
    },
    setExportNotes: (state, action) => {
      state.currentExportOrder.notes = action.payload;
    },
    setExportOrders: (state, action) => {
      state.exportOrders = action.payload;
    },
    setExportStats: (state, action) => {
      state.exportStats = action.payload;
    },
    clearCurrentExportOrder: (state) => {
      state.currentExportOrder = {
        items: [],
        customerName: '',
        customerPhone: '',
        paymentMethod: 'cash',
        notes: '',
        totalAmount: 0
      };
    },

    // Warehouse receipt actions
    setWarehouseReceipt: (state, action) => {
      state.warehouseReceipt = action.payload;
    },
    updateWarehouseReceiptItem: (state, action) => {
      const { index, actualQuantity } = action.payload;
      state.warehouseReceipt.items[index].actualQuantity = actualQuantity;
    },
    setWarehouseStaff: (state, action) => {
      state.warehouseReceipt.warehouseStaff = action.payload;
    },
    setWarehouseReceiptCreating: (state, action) => {
      state.warehouseReceipt.isCreating = action.payload;
    },
    clearWarehouseReceipt: (state) => {
      state.warehouseReceipt = {
        orderId: null,
        items: [],
        warehouseStaff: '',
        isCreating: false
      };
    },

    // Shared actions
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  // Import actions
  setCurrentImportOrder,
  addImportItem,
  updateImportItem,
  removeImportItem,
  setImportSupplier,
  setImportNotes,
  clearCurrentImportOrder,
  setImportOrders,
  
  // Export actions
  setCurrentExportOrder,
  updateExportItem,
  removeExportItem,
  setExportCustomer,
  setExportPaymentMethod,
  setExportNotes,
  setExportOrders,
  setExportStats,
  clearCurrentExportOrder,
  
  // Warehouse actions
  setWarehouseReceipt,
  updateWarehouseReceiptItem,
  setWarehouseStaff,
  setWarehouseReceiptCreating,
  clearWarehouseReceipt,
  
  // Shared actions
  setLoading,
  setError,
} = orderSlice.actions;

const orderReducer = orderSlice.reducer;
export default orderReducer;