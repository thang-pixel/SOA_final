import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/userSlice'
import authReducer from './reducers/authSlice'
import inventoryReducer from './reducers/inventorySlice'
import orderReducer from './reducers/orderSlice'
export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
    inventory: inventoryReducer,
    order: orderReducer,
    // thêm các slice khác ở đây
  },
})