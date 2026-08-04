import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/Users";
import Movies from "../pages/Movies/Movies";
import Showtimes from "../pages/Showtimes/Showtimes";
import Cinemas from "../pages/cinemas/Cinemas";
import Bookings from "../pages/Bookings/Bookings";
import Combos from "../pages/Combos";
import Promotions from "../pages/Promotions/Promotions";
import Statistics from "../pages/Statistics";
import Settings from "../pages/Settings";
import Notifications from "../pages/Notifications";
import Comments from "../pages/Comments";
import Staff from "../pages/Staff";
import NewsManagement from "../pages/NewsManagement";
import BlogManagement from "../pages/BlogManagement";
import PointsManagement from "../pages/PointsManagement";
import AdminLogin from "../pages/AdminLogin/AdminLogin";
import { getValidStoredToken } from "../../utils/auth";

export function AdminRoutes() {
  const profile = useSelector((state) => state.user.profile);
  const token = getValidStoredToken();
  const storedUser = profile || JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = String(storedUser?.role || '').toLowerCase();
  const canAccessAdmin = token && ['admin', 'staff', 'manager', 'technician'].includes(userRole);

  const isStaff = userRole === 'staff';
  const isTechnician = userRole === 'technician';

  const staffRoutes = [
    <Route key="users" path="users" element={<AdminLayout><Users /></AdminLayout>} />,
    <Route key="bookings" path="bookings" element={<AdminLayout><Bookings /></AdminLayout>} />,
    <Route key="statistics" path="statistics" element={<AdminLayout><Statistics /></AdminLayout>} />,
    <Route key="index" path="" element={<AdminLayout><Bookings /></AdminLayout>} />,
  ];
  const technicianRoutes = [
    <Route key="staff" path="staff" element={<AdminLayout><Staff /></AdminLayout>} />,
    <Route key="movies" path="movies" element={<AdminLayout><Movies /></AdminLayout>} />,
    <Route key="showtimes" path="showtimes" element={<AdminLayout><Showtimes /></AdminLayout>} />,
    <Route key="cinemas" path="cinemas" element={<AdminLayout><Cinemas /></AdminLayout>} />,
    <Route key="combos" path="combos" element={<AdminLayout><Combos /></AdminLayout>} />,
    <Route key="promotions" path="promotions" element={<AdminLayout><Promotions /></AdminLayout>} />,
    <Route key="points" path="points" element={<AdminLayout><PointsManagement /></AdminLayout>} />,
    <Route key="news" path="news" element={<AdminLayout><NewsManagement /></AdminLayout>} />,
    <Route key="blog" path="blog" element={<AdminLayout><BlogManagement /></AdminLayout>} />,
    <Route key="notifications" path="notifications" element={<AdminLayout><Notifications /></AdminLayout>} />,
    <Route key="comments" path="comments" element={<AdminLayout><Comments /></AdminLayout>} />,
    <Route key="settings" path="settings" element={<AdminLayout><Settings /></AdminLayout>} />,
    <Route key="index" path="" element={<AdminLayout><Staff /></AdminLayout>} />,
  ];
  const adminRoutes = [
    <Route key="dashboard" path="dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />,
    <Route key="staff" path="staff" element={<AdminLayout><Staff /></AdminLayout>} />,
    <Route key="users" path="users" element={<AdminLayout><Users /></AdminLayout>} />,
    <Route key="movies" path="movies" element={<AdminLayout><Movies /></AdminLayout>} />,
    <Route key="showtimes" path="showtimes" element={<AdminLayout><Showtimes /></AdminLayout>} />,
    <Route key="cinemas" path="cinemas" element={<AdminLayout><Cinemas /></AdminLayout>} />,
    <Route key="bookings" path="bookings" element={<AdminLayout><Bookings /></AdminLayout>} />,
    <Route key="combos" path="combos" element={<AdminLayout><Combos /></AdminLayout>} />,
    <Route key="promotions" path="promotions" element={<AdminLayout><Promotions /></AdminLayout>} />,
    <Route key="points" path="points" element={<AdminLayout><PointsManagement /></AdminLayout>} />,
    <Route key="news" path="news" element={<AdminLayout><NewsManagement /></AdminLayout>} />,
    <Route key="blog" path="blog" element={<AdminLayout><BlogManagement /></AdminLayout>} />,
    <Route key="notifications" path="notifications" element={<AdminLayout><Notifications /></AdminLayout>} />,
    <Route key="comments" path="comments" element={<AdminLayout><Comments /></AdminLayout>} />,
    <Route key="statistics" path="statistics" element={<AdminLayout><Statistics /></AdminLayout>} />,
    <Route key="settings" path="settings" element={<AdminLayout><Settings /></AdminLayout>} />,
    <Route key="index" path="" element={<AdminLayout><Dashboard /></AdminLayout>} />,
  ];

  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      {canAccessAdmin && (
        <>
          {isStaff ? staffRoutes : isTechnician ? technicianRoutes : adminRoutes}
          <Route
            path="*"
            element={<Navigate to={isStaff ? "/admin/bookings" : isTechnician ? "/admin/staff" : "/admin/dashboard"} replace />}
          />
        </>
      )}
      {!canAccessAdmin && (
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      )}
    </Routes>
  );
}
