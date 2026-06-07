import './App.css'
import AppRoutes from './routes/AppRoutes'
import { setUser } from './redux/slices/userSlice'
import store from './redux/store'

function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

const token = localStorage.getItem('token')
if (token) {
  const payload = parseJwt(token)
  if (payload?.role) {
    store.dispatch(setUser({
      role: payload.role,
      userId: payload.userId,
      email: payload.email || null,
    }))
  }
}

function App(){
  return <AppRoutes />
}

export default App
