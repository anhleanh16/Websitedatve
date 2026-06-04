import { Routes, Route } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/Dashboard';
import Users from '../pages/Users';
import Movies from '../pages/Movies';
import Bookings from '../pages/Bookings';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="movies" element={<Movies />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </AdminLayout>
  );
}
