import { Routes, Route } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/Users";
import Movies from "../pages/Movies";
import Showtimes from "../pages/Showtimes";
import Cinemas from "../pages/Cinemas";
import Bookings from "../pages/Bookings";
import Promotions from "../pages/Promotions";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import Notifications from "../pages/Notifications";
import Comments from "../pages/Comments";

export function AdminRoutes() {
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="dashboard"     element={<Dashboard />}     />
        <Route path="users"         element={<Users />}         />
        <Route path="movies"        element={<Movies />}        />
        <Route path="showtimes"     element={<Showtimes />}     />
        <Route path="cinemas"       element={<Cinemas />}       />
        <Route path="bookings"      element={<Bookings />}      />
        <Route path="promotions"    element={<Promotions />}    />
        <Route path="notifications" element={<Notifications />} />
        <Route path="comments"      element={<Comments />}      />
        <Route path="reports"       element={<Reports />}       />
        <Route path="settings"      element={<Settings />}      />
      </Routes>
    </AdminLayout>
  );
}
