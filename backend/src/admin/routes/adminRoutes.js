import express from 'express';
import {
  adminDashboard,
  getAdminUsers,
  getAdminBookings,
  getAdminBookingDetail,
  refundBooking,
  checkInBooking,
  verifyBookingCode,
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  deactivateAdminUser,
} from '../controllers/adminController.js';

const router = express.Router();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', adminDashboard);

// ─── User Management ─────────────────────────────────────────────────────────
router.get('/users', getAdminUsers);
router.put('/users/:userId/deactivate', deactivateAdminUser);

// ─── Booking Management ──────────────────────────────────────────────────────
// Danh sách vé (có filter & search)
router.get('/bookings', getAdminBookings);

// Xác minh mã vé / QR (đặt trước :orderId để tránh conflict)
router.get('/bookings/verify/:code', verifyBookingCode);

// Chi tiết vé
router.get('/bookings/:orderId', getAdminBookingDetail);

// Hoàn vé
router.put('/bookings/:orderId/refund', refundBooking);

// Kiểm tra & check-in vé
router.put('/bookings/:orderId/check-in', checkInBooking);

// ─── Movie Management ─────────────────────────────────────────────────────────
router.get('/movies', getAdminMovies);
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

export default router;
