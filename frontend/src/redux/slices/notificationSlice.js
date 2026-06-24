import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
  },
  reducers: {
    setNotifications(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : []
    },
    markAsRead(state, action) {
      const item = state.items.find(n => n.id === action.payload)
      if (item) item.read = true
    },
    markAllAsRead(state) {
      state.items.forEach(n => { n.read = true })
    },
    deleteNotification(state, action) {
      state.items = state.items.filter(n => n.id !== action.payload)
    },
    clearAll(state) {
      state.items = []
    },
    addNotification(state, action) {
      state.items.unshift({ ...action.payload, id: Date.now(), read: false })
    },
  },
})

export const { setNotifications, markAsRead, markAllAsRead, deleteNotification, clearAll, addNotification } = notificationSlice.actions
export default notificationSlice.reducer
