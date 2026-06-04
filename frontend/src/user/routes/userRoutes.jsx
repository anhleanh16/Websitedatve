import { Routes, Route } from 'react-router-dom';
import Home from '../pages/Home';
import MovieDetail from '../pages/MovieDetail';
import Booking from '../pages/Booking';
import Payment from '../pages/Payment';
import Cinemas from '../pages/Cinemas';
import AIAssistant from '../pages/AIAssistant';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import Login from '../pages/Login';
import Register from '../pages/Register';

export function UserRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/movie/:id" element={<MovieDetail />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/payment" element={<Payment />} />
      <Route path="/cinemas" element={<Cinemas />} />
      <Route path="/ai-assistant" element={<AIAssistant />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
