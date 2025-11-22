import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/userSlice'
import authReducer from './reducers/authSlice'
import inventoryReducer from './reducers/inventorySlice'
import orderReducer from './reducers/orderSlice'
import notificationReducer from './reducers/notificationSlice'
import reportSlice from './reducers/reportSlice'
export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
    inventory: inventoryReducer,
    order: orderReducer,
    notification: notificationReducer,
    report: reportSlice,
  
  },
})