import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import notificationReducer from './slices/notificationSlice'
import regionReducer from './slices/regionSlice'

const store = configureStore({
  reducer: {
    user: userReducer,
    notifications: notificationReducer,
    region: regionReducer,
  },
})

export default store
