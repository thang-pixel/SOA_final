import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/userSlice'
import authReducer from './reducers/authSlice'

export const store = configureStore({
  reducer: {
    user: userReducer,
    auth: authReducer,
    // thêm các slice khác ở đây
  },
})