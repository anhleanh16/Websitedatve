import express from 'express';
import {
  getPublicCinemas,
  getPublicCinemaById,
  userGetProfile,
  userGetMovies,
  userGetShowtimes,
  userGetMovieById,
  userGetCombos,
  userUpdateProfile,
  userGetBookings,
  userGetBookingDetail,
  userCreateBooking,
  userConfirmCardPayment,
  userGetNotifications,
  userMarkNotificationRead,
  userMarkAllNotificationsRead,
  userDeleteNotification,
  userClearNotifications,
  userGetPromotions,
  userGetTodayPromotions,
  validatePromoCode,
  userGetNews,
  userGetNewsBySlug,
  userChangePassword,
  userSetInitialPassword,
  userUpdateAvatar,
  userRemoveAvatar,
  userRequestEmailChangeOtp,
  userConfirmEmailChangeOtp,
  userGetProfileAuditLogs,
} from '../controllers/userController.js';
import { authMiddleware, selfOrAdminOnly } from '../../admin/middleware/authMiddleware.js';
import { uploadStaffAvatar } from '../../../config/upload.js';
import { requireVerifiedEmail } from '../middleware/requireVerifiedEmail.js';

const router = express.Router();

// Public cinemas
router.get('/cinemas', getPublicCinemas);
router.get('/cinemas/:id', getPublicCinemaById);
router.get('/movies', userGetMovies);
router.get('/showtimes', userGetShowtimes);
router.get('/combos', userGetCombos);
router.get('/movies/:id', userGetMovieById);
router.get('/promotions/today', userGetTodayPromotions);
router.post('/promotions/validate', validatePromoCode);
router.get('/news', userGetNews);
router.get('/news/:slug', userGetNewsBySlug);

// Profile
router.get('/:userId/profile', authMiddleware, selfOrAdminOnly, userGetProfile);
router.put('/:userId/profile', authMiddleware, selfOrAdminOnly, userUpdateProfile);
router.post('/:userId/profile/email-change/request-otp', authMiddleware, selfOrAdminOnly, userRequestEmailChangeOtp);
router.post('/:userId/profile/email-change/confirm-otp', authMiddleware, selfOrAdminOnly, userConfirmEmailChangeOtp);
router.get('/:userId/profile/audit-logs', authMiddleware, selfOrAdminOnly, userGetProfileAuditLogs);
router.put('/:userId/change-password', authMiddleware, selfOrAdminOnly, userChangePassword);
router.put('/:userId/initial-password', authMiddleware, selfOrAdminOnly, userSetInitialPassword);
router.post('/:userId/avatar', authMiddleware, selfOrAdminOnly, uploadStaffAvatar.single('avatar'), userUpdateAvatar);
router.delete('/:userId/avatar', authMiddleware, selfOrAdminOnly, userRemoveAvatar);
router.get('/:userId/notifications', authMiddleware, selfOrAdminOnly, userGetNotifications);
router.put('/:userId/notifications/read-all', authMiddleware, selfOrAdminOnly, userMarkAllNotificationsRead);
router.put('/:userId/notifications/:notificationId/read', authMiddleware, selfOrAdminOnly, userMarkNotificationRead);
router.delete('/:userId/notifications/:notificationId', authMiddleware, selfOrAdminOnly, userDeleteNotification);
router.delete('/:userId/notifications', authMiddleware, selfOrAdminOnly, userClearNotifications);
router.get('/:userId/promotions', authMiddleware, selfOrAdminOnly, userGetPromotions);

// Bookings
router.get('/:userId/bookings', authMiddleware, selfOrAdminOnly, userGetBookings);
router.get('/:userId/bookings/:orderId', authMiddleware, selfOrAdminOnly, userGetBookingDetail);
router.post('/:userId/bookings', authMiddleware, selfOrAdminOnly, requireVerifiedEmail, userCreateBooking);
router.post('/:userId/bookings/:orderId/confirm-card', authMiddleware, selfOrAdminOnly, requireVerifiedEmail, userConfirmCardPayment);

export default router;
