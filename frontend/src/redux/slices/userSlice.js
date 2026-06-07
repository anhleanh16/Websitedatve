import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  profile: null,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action) {
      state.profile = action.payload
    },
    clearUser(state) {
      state.profile = null
    },
  },
})

export const { setUser, clearUser } = userSlice.actions
export default userSlice.reducer
