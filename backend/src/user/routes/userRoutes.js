import express from 'express';
import {
  getPublicCinemas,
  getPublicCinemaById,
  userGetProfile,
  userGetMovies,
  userGetMovieById,
  userUpdateProfile,
  userGetBookings,
  userCreateBooking
} from '../controllers/userController.js';

const router = express.Router();

// Public cinemas
router.get('/cinemas', getPublicCinemas);
router.get('/cinemas/:id', getPublicCinemaById);
router.get('/movies', userGetMovies);
router.get('/movies/:id', userGetMovieById);

// Profile
router.get('/:userId/profile', userGetProfile);
router.put('/:userId/profile', userUpdateProfile);

// Bookings
router.get('/:userId/bookings', userGetBookings);
router.post('/:userId/bookings', userCreateBooking);

export default router;
