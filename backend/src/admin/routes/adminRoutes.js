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
  restoreMovie,
  permanentDeleteMovie,
  toggleHideMovie,
  deactivateAdminUser,
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/adminController.js';
import { uploadMovieFiles } from '../../../config/upload.js';

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
// Upload nhiều poster (từ 6-12 file) và 1 trailer
router.post('/movies', uploadMovieFiles.fields([{ name: 'posters', maxCount: 12 }, { name: 'trailer', maxCount: 1 }]), createMovie);
router.put('/movies/:id', uploadMovieFiles.fields([{ name: 'posters', maxCount: 12 }, { name: 'trailer', maxCount: 1 }]), updateMovie);
router.delete('/movies/:id', deleteMovie);
router.put('/movies/:id/restore', restoreMovie);
router.delete('/movies/:id/permanent', permanentDeleteMovie);
router.put('/movies/:id/toggle-hide', toggleHideMovie);

// ─── Movie Category Management ─────────────────────────────────────────────────
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

export default router;
