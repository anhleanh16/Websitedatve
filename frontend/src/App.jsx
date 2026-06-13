import './App.css'
import AppRoutes from './routes/AppRoutes'
import { setUser } from './redux/slices/userSlice'
import store from './redux/store'

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// Khôi phục session từ localStorage khi tải lại trang
const token = localStorage.getItem('token')
if (token) {
  const payload = parseJwt(token)
  if (payload?.userId) {
    const savedUser = localStorage.getItem('user')
    const user = savedUser ? JSON.parse(savedUser) : {
      id:    payload.userId,
      name:  payload.name  || '',
      email: payload.email || '',
      role:  payload.role  || 'user',
    }
    store.dispatch(setUser({ token, user }))
  }
}

function App() {
  return <AppRoutes />
}

export default App
