import express from 'express';
import {
  adminDashboard,
  getAdminUsers,
  getAdminBookings,
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  deactivateAdminUser
} from '../controllers/adminController.js';

const router = express.Router();

// Admin Dashboard
router.get('/dashboard', adminDashboard);

// User Management
router.get('/users', getAdminUsers);
router.put('/users/:userId/deactivate', deactivateAdminUser);

// Booking Management
router.get('/bookings', getAdminBookings);

// Movie Management
router.get('/movies', getAdminMovies);
router.post('/movies', createMovie);
router.put('/movies/:id', updateMovie);
router.delete('/movies/:id', deleteMovie);

export default router;
