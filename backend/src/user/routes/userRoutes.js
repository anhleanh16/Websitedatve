import express from 'express';
import {
  getPublicCinemas,
  getPublicCinemaById,
  userGetProfile,
  userGetMovies,
  userGetShowtimes,
  userGetMovieById,
  userUpdateProfile,
  userGetBookings,
  userCreateBooking,
  userGetNotifications,
  userMarkNotificationRead,
  userMarkAllNotificationsRead,
  userDeleteNotification,
  userClearNotifications,
  userGetPromotions,
  userGetNews,
  userGetNewsBySlug,
} from '../controllers/userController.js';
import { authMiddleware, selfOrAdminOnly } from '../../admin/middleware/authMiddleware.js';

const router = express.Router();

// Public cinemas
router.get('/cinemas', getPublicCinemas);
router.get('/cinemas/:id', getPublicCinemaById);
router.get('/movies', userGetMovies);
router.get('/showtimes', userGetShowtimes);
router.get('/movies/:id', userGetMovieById);
router.get('/news', userGetNews);
router.get('/news/:slug', userGetNewsBySlug);

// Profile
router.get('/:userId/profile', userGetProfile);
router.put('/:userId/profile', userUpdateProfile);
router.get('/:userId/notifications', authMiddleware, selfOrAdminOnly, userGetNotifications);
router.put('/:userId/notifications/read-all', authMiddleware, selfOrAdminOnly, userMarkAllNotificationsRead);
router.put('/:userId/notifications/:notificationId/read', authMiddleware, selfOrAdminOnly, userMarkNotificationRead);
router.delete('/:userId/notifications/:notificationId', authMiddleware, selfOrAdminOnly, userDeleteNotification);
router.delete('/:userId/notifications', authMiddleware, selfOrAdminOnly, userClearNotifications);
router.get('/:userId/promotions', authMiddleware, selfOrAdminOnly, userGetPromotions);

// Bookings
router.get('/:userId/bookings', userGetBookings);
router.post('/:userId/bookings', userCreateBooking);

export default router;
