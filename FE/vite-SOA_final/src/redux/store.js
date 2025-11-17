import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/userSlice'
import authReducer from './reducers/authSlice'
import inventoryReducer from './reducers/inventorySlice'
export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
    inventory: inventoryReducer,
    // thêm các slice khác ở đây
  },
})