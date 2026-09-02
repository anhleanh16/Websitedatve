import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Users from "../pages/Users/Users";
import Movies from "../pages/Movies/Movies";
import Showtimes from "../pages/Showtimes/Showtimes";
import Cinemas from "../pages/cinemas/Cinemas";
import Bookings from "../pages/Bookings/Bookings";
import Combos from "../pages/Combos/Combos";
import Promotions from "../pages/Promotions/Promotions";
import Statistics from "../pages/Statistics/Statistics";
import Settings from "../pages/Settings/Settings";
import Notifications from "../pages/Notifications/Notifications";
import Comments from "../pages/Comments/Comments";
import Staff, { AdminAttendance } from "../pages/Staff/Staff";
import NewsManagement from "../pages/NewsManagement/NewsManagement";
import BlogManagement from "../pages/BlogManagement/BlogManagement";
import PointsManagement from "../pages/PointsManagement/PointsManagement";
import AdminLogin from "../pages/AdminLogin/AdminLogin";
import { getValidStoredToken } from "../../utils/auth";

export function AdminRoutes() {
  const profile = useSelector((state) => state.user.profile);
  const token = getValidStoredToken();
  let localUser = {};
  try {
    localUser = JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    localStorage.removeItem('user');
  }
  const storedUser = { ...localUser, ...(profile || {}) };
  const userRole = String(storedUser?.role || '').toLowerCase();
  const canAccessAdmin = token && ['admin', 'employee', 'manager'].includes(userRole);

  const isManager = userRole === 'manager'
    || (userRole === 'employee' && /quản lý|quan ly|manager/i.test(
      String(storedUser?.employee_position || storedUser?.position || ''),
    ));
  const isEmployee = userRole === 'employee' && !isManager;

  const fullAdminRoutes = [
    <Route key="dashboard" path="dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />,
    <Route key="roles" path="roles" element={<Navigate to="/admin/dashboard" replace />} />,
    <Route key="staff" path="staff" element={<AdminLayout><Staff /></AdminLayout>} />,
    <Route key="attendance" path="attendance" element={<AdminLayout><AdminAttendance /></AdminLayout>} />,
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
  const managerRoutes = fullAdminRoutes.map((route) => (
    route.key === "dashboard" || route.key === "index"
      ? <Route key={route.key} path={route.props.path} element={<Navigate to="/admin/bookings" replace />} />
      : route
  ));
  const employeeRoutes = managerRoutes.filter((route) => ["bookings", "index"].includes(String(route.key)));

  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      {canAccessAdmin && (
        <>
          {isManager ? managerRoutes : isEmployee ? employeeRoutes : fullAdminRoutes}
          <Route
            path="*"
            element={<Navigate to={isEmployee ? "/admin/bookings" : "/admin/dashboard"} replace />}
          />
        </>
      )}
      {!canAccessAdmin && (
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      )}
    </Routes>
  );
}
