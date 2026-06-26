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
import { getValidStoredToken } from "../../utils/auth";

export function AdminRoutes() {
  const profile = useSelector((state) => state.user.profile);
  const token = getValidStoredToken();

  if (!token || profile?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard"     element={<Dashboard />}     />
        <Route path="staff"         element={<Staff />}         />
        <Route path="users"         element={<Users />}         />
        <Route path="movies"        element={<Movies />}        />
        <Route path="showtimes"     element={<Showtimes />}     />
        <Route path="cinemas"       element={<Cinemas />}       />
        <Route path="bookings"      element={<Bookings />}      />
        <Route path="combos"        element={<Combos />}        />
        <Route path="promotions"    element={<Promotions />}    />
        <Route path="news"          element={<NewsManagement />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="comments"      element={<Comments />}      />
        <Route path="statistics"       element={<Statistics />}       />
        <Route path="settings"      element={<Settings />}      />
      </Routes>
    </AdminLayout>
  );
}
