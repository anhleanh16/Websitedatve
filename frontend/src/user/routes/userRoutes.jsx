import { Navigate, Routes, Route } from "react-router-dom";
import Home from "../pages/Homes/Home";
import MovieDetail from "../pages/MovieDetails/MovieDetail";
import Film from "../pages/Films/Film";
import Booking from "../pages/Bookings/Booking";
import Payment from "../pages/Payment/Payment";
import PaymentPending from "../pages/Payment/PaymentPending";
import PaymentResult from "../pages/Payment/PaymentResult";
import News from "../pages/News/News";
import NewsDetail from "../pages/News/NewsDetail";
import Blog from "../pages/Blog/Blog";
import BlogDetail from "../pages/Blog/BlogDetail";
import Cinemas from "../pages/Cinemas/Cinemas";
import Notifications from "../pages/Notifications/Notifications";
import Profile from "../pages/Profiles/Profile";
import Login from "../pages/Logins/Login";
import ForgotPassword from "../pages/Logins/ForgotPassword";
import ResetPassword from "../pages/Logins/ResetPassword";
import Register from "../pages/Registers/Register";
import InitialPassword from "../pages/InitialPassword/InitialPassword";
import Membership from "../pages/Membership/Membership";
import MobileAiChatPage from "../pages/AiChat/MobileAiChatPage";
import UserLayout from "../Layouts/UserLayout";

function AiAssistantEntry() {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  return <Navigate to={isMobile ? '/ai-chat' : '/?chatbox=1'} replace />;
}

export function UserRoutes() {
  return (
    <Routes>
      <Route path="/ai-chat" element={<MobileAiChatPage />} />
      <Route path="/ai-assistant" element={<AiAssistantEntry />} />
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/Moviedetails/MovieDetail" caseSensitive={false} element={<MovieDetail />} />
        <Route path="/Films/Film" element={<Film />} />
        <Route path="/movie/:id" caseSensitive={false} element={<MovieDetail />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/Bookings/Booking" element={<Booking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/payment/pending" element={<PaymentPending />} />
        <Route path="/payment/result" element={<PaymentResult />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/cinemas" element={<Cinemas />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Logins/Login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/Logins/ForgotPassword" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/Logins/ResetPassword" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/Registers/Register" element={<Register />} />
        <Route path="/create-password" element={<InitialPassword />} />
        <Route path="/Membership" element={<Membership />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Route>
    </Routes>
  );
}
