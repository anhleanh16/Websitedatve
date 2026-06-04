import express from 'express';
import {
  userGetProfile,
  userUpdateProfile,
  userGetBookings,
  userCreateBooking
} from '../controllers/userController.js';

const router = express.Router();

// Profile
router.get('/:userId/profile', userGetProfile);
router.put('/:userId/profile', userUpdateProfile);

// Bookings
router.get('/:userId/bookings', userGetBookings);
router.post('/:userId/bookings', userCreateBooking);

export default router;
