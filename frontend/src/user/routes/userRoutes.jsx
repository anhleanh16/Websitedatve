import { Routes, Route } from "react-router-dom";
import Home from "../pages/Homes/Home";
import MovieDetail from "../pages/MovieDetails/MovieDetail";
import Film from "../pages/Films/Film";
import Booking from "../pages/Bookings/Booking";
import Payment from "../pages/Payment";
import Cinemas from "../pages/Cinemas";
import AIAssistant from "../pages/AIAssistant";
import Notifications from "../pages/Notifications/Notifications";
import Profile from "../pages/Profiles/Profile";
import Login from "../pages/Logins/Login";
import Register from "../pages/Registers/Register";
import Membership from "../pages/Membership/Membership";
import UserLayout from "../Layouts/UserLayout";

export function UserRoutes() {
  return (
    <Routes>
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/Moviedetails/MovieDetail" caseSensitive={false} element={<MovieDetail />} />
        <Route path="/Films/Film" element={<Film />} />
        <Route path="/movie/:id" caseSensitive={false} element={<MovieDetail />} />
        <Route path="/Bookings/Booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/cinemas" element={<Cinemas />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/Logins/Login" element={<Login />} />
        <Route path="/Registers/Register" element={<Register />} />
        <Route path="/Membership" element={<Membership />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Route>
    </Routes>
  );
}
