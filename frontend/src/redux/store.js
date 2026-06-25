import { configureStore } from '@reduxjs/toolkit'
import userReducer from './slices/userSlice'
import notificationReducer from './slices/notificationSlice'
import regionReducer from './slices/regionSlice'
import cinemaReducer from './slices/cinemaSlice'

const store = configureStore({
  reducer: {
    user: userReducer,
    notifications: notificationReducer,
    region: regionReducer,
    cinema: cinemaReducer,
  },
})

export default store
