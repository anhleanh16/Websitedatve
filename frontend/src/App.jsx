import './App.css'
import AppRoutes from './routes/AppRoutes'
import { setUser } from './redux/slices/userSlice'
import store from './redux/store'
import { clearStoredSession, getValidStoredToken, parseJwt } from './utils/auth'

// Khôi phục session từ localStorage khi tải lại trang
const token = getValidStoredToken()
if (token) {
  const payload = parseJwt(token)
  if (payload?.userId) {
    const savedUser = localStorage.getItem('user')
    const user = savedUser ? JSON.parse(savedUser) : {
      id:    payload.userId,
      name:  payload.name  || '',
      email: payload.email || '',
      role:  String(payload.role || 'user').toLowerCase(),
    }
    store.dispatch(setUser({ token, user }))
  }
} else {
  clearStoredSession()
}

function App() {
  return <AppRoutes />
}

export default App
