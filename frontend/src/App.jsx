import './App.css'
import AppRoutes from './routes/AppRoutes'
import { setUser } from './redux/slices/userSlice'
import store from './redux/store'

<<<<<<< HEAD
function App() {
  return (
    <Routes>
      {/* Admin: full-width, layout riêng, không bọc trong .app-content */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* User: bọc trong .app để dùng layout user */}
      <Route
        path="/*"
        element={
          <div className="app">
            <main className="app-content">
              <UserRoutes />
            </main>
          </div>
        }
      />
    </Routes>
  );
=======
function parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
>>>>>>> a94eef28f6f9f54560c3d261b6cb90427b00c27e
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
