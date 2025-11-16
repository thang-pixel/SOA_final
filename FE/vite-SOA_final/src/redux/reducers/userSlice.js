import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  info: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUserInfo(state, action) {
      state.info = action.payload
    },
    clearUserInfo(state) {
      state.info = null
    },
  },
})

export const { setUserInfo, clearUserInfo } = userSlice.actions
export default userSlice.reducer