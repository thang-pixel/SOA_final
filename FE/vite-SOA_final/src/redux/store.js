import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/userSlice'
import authReducer from './reducers/authSlice'
import inventoryReducer from './reducers/inventorySlice'
import orderReducer from './reducers/orderSlice'
import notificationReducer from './reducers/notificationSlice'
export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
    inventory: inventoryReducer,
    order: orderReducer,
    notification: notificationReducer,
    // thêm các slice khác ở đây
  },
})