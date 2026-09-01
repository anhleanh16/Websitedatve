import './App.css'
import AppRoutes from './routes/AppRoutes'
import GlobalAiButton from './components/GlobalAiButton'
import { setUser } from './redux/slices/userSlice'
import store from './redux/store'
import { clearStoredSession, getValidStoredToken, parseJwt } from './utils/auth'

try {
  const token = getValidStoredToken()
  if (token) {
    const payload = parseJwt(token)
    if (payload?.userId) {
      const savedUser = localStorage.getItem('user')
      let user = {
        id:    payload.userId,
        name:  payload.name  || '',
        email: payload.email || '',
        role:  String(payload.role || 'user').toLowerCase(),
      }
      if (savedUser) {
        try {
          user = JSON.parse(savedUser)
        } catch {
          try { localStorage.removeItem('user') } catch {}
        }
      }
      try {
        store.dispatch(setUser({ token, user }))
      } catch (_dispatchErr) {}
    }
  } else {
    try { clearStoredSession() } catch {}
  }
} catch (_topErr) {
  try { clearStoredSession() } catch {}
  try {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  } catch {}
}

function App() {
  return <><AppRoutes /><GlobalAiButton /></>
}

export default App
