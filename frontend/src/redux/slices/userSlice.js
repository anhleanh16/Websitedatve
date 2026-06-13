import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  profile: null,       // { id, name, email, phone, avatar, point, role }
  token:   null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      // payload: { user: {...}, token: '...' }  hoặc trực tiếp user object
      if (action.payload?.token) {
        state.token   = action.payload.token
        state.profile = action.payload.user ?? action.payload
      } else {
        state.profile = action.payload
      }
    },
    clearUser(state) {
      state.profile = null
      state.token   = null
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer
