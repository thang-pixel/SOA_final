import { createSlice } from '@reduxjs/toolkit';

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    items: [],
    loading: false,
    error: null,
    filters: {
      search: '',
      stockStatus: 'all',
    },
  },
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setSearchFilter: (state, action) => {
      state.filters.search = action.payload;
    },
    setStockFilter: (state, action) => {
      state.filters.stockStatus = action.payload;
    },
  },
});

export const { setItems, setLoading, setError, setSearchFilter, setStockFilter } = inventorySlice.actions;
const inventoryReducer = inventorySlice.reducer;
export default inventoryReducer;