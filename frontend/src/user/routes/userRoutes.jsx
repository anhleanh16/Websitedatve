import { Routes, Route } from 'react-router-dom';
import Home from '../../pages/Home/Home';
import MovieDetail from '../../pages/MovieDetail/MovieDetail';
import Booking from '../../pages/Booking/Booking';
import Payment from '../../pages/Payment/Payment';
import Cinemas from '../../pages/Cinemas/Cinemas';
import AIAssistant from '../../pages/AIAssistant/AIAssistant';
import Notifications from '../../pages/Notifications/Notifications';
import Profile from '../../pages/Profile/Profile';
import Login from '../../pages/Login/Login';
import Register from '../../pages/Register/Register';

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
