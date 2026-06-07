import { Routes, Route } from 'react-router-dom'
import { UserRoutes } from '../user/routes/userRoutes'
import { AdminRoutes } from '../admin/routes/adminRoutes'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/*" element={<UserRoutes />} />
    </Routes>
  )
}
