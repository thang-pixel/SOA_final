import { createSlice } from '@reduxjs/toolkit';

const orderSlice = createSlice({
  name: 'order',
  initialState: {
    currentImportOrder: {
      items: [],
      supplier: '',
      notes: '',
      totalAmount: 0
    },
    importOrders: [],
    loading: false,
    error: null,
    // Thêm state cho warehouse receipt
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
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentImportOrder,
  addImportItem,
  updateImportItem,
  removeImportItem,
  setImportSupplier,
  setImportNotes,
  clearCurrentImportOrder,
  setImportOrders,
  setWarehouseReceipt,
  updateWarehouseReceiptItem,
  setWarehouseStaff,
  setWarehouseReceiptCreating,
  clearWarehouseReceipt,
  setLoading,
  setError,
} = orderSlice.actions;

const orderReducer = orderSlice.reducer;
export default orderReducer;