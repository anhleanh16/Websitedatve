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
import AdminLogin from "../pages/AdminLogin/AdminLogin";
import { getValidStoredToken } from "../../utils/auth";

export function AdminRoutes() {
  const profile = useSelector((state) => state.user.profile);
  const token = getValidStoredToken();
  const isAdmin = token && profile?.role === "admin";

  return (
    <Routes>
      {/* Route login không cần authentication */}
      <Route path="login" element={<AdminLogin />} />

      {/* Các route khác cần authentication */}
      {isAdmin && (
        <>
          <Route path="dashboard" element={<AdminLayout><Dashboard /></AdminLayout>} />
          <Route path="staff" element={<AdminLayout><Staff /></AdminLayout>} />
          <Route path="users" element={<AdminLayout><Users /></AdminLayout>} />
          <Route path="movies" element={<AdminLayout><Movies /></AdminLayout>} />
          <Route path="showtimes" element={<AdminLayout><Showtimes /></AdminLayout>} />
          <Route path="cinemas" element={<AdminLayout><Cinemas /></AdminLayout>} />
          <Route path="bookings" element={<AdminLayout><Bookings /></AdminLayout>} />
          <Route path="combos" element={<AdminLayout><Combos /></AdminLayout>} />
          <Route path="promotions" element={<AdminLayout><Promotions /></AdminLayout>} />
          <Route path="news" element={<AdminLayout><NewsManagement /></AdminLayout>} />
          <Route path="blog" element={<AdminLayout><BlogManagement /></AdminLayout>} />
          <Route path="notifications" element={<AdminLayout><Notifications /></AdminLayout>} />
          <Route path="comments" element={<AdminLayout><Comments /></AdminLayout>} />
          <Route path="statistics" element={<AdminLayout><Statistics /></AdminLayout>} />
          <Route path="settings" element={<AdminLayout><Settings /></AdminLayout>} />
          <Route index element={<AdminLayout><Dashboard /></AdminLayout>} />
        </>
      )}

      {/* Redirect về login nếu không phải admin */}
      {!isAdmin && (
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      )}
    </Routes>
  );
}
