import express from "express";
import {
  getAdminBookings,
  getAdminBookingDetail,
  refundBooking,
  checkInBooking,
  verifyBookingCode,
} from "../controllers/bookingController.js";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../controllers/categoryController.js";
import { getDashboardStats } from "../controllers/dashboardController.js";
import {
  getAdminMovies,
  createMovie,
  updateMovie,
  deleteMovie,
  restoreMovie,
  permanentDeleteMovie,
  toggleHideMovie,
} from "../controllers/movieController.js";
import {
  getShowtimes,
  getShowtimeById,
  createShowtime,
  updateShowtime,
  deleteShowtime,
  cancelShowtime,
  getShowtimeCinemas,
  getShowtimeRooms,
} from "../controllers/showtimeController.js";
import {
  getAdminUsers,
  deactivateAdminUser,
} from "../controllers/userController.js";
import { uploadMovieFiles } from "../../../config/upload.js";

const router = express.Router();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", getDashboardStats);

// ─── User Management ─────────────────────────────────────────────────────────
router.get("/users", getAdminUsers);
router.put("/users/:userId/deactivate", deactivateAdminUser);

// ─── Booking Management ──────────────────────────────────────────────────────
router.get("/bookings", getAdminBookings);
router.get("/bookings/verify/:code", verifyBookingCode);
router.get("/bookings/:orderId", getAdminBookingDetail);
router.put("/bookings/:orderId/refund", refundBooking);
router.put("/bookings/:orderId/check-in", checkInBooking);

// ─── Movie Management ─────────────────────────────────────────────────────────
router.get("/movies", getAdminMovies);
router.post(
  "/movies",
  uploadMovieFiles.fields([
    { name: "posters", maxCount: 12 },
    { name: "trailer", maxCount: 1 },
  ]),
  createMovie,
);
router.put(
  "/movies/:id",
  uploadMovieFiles.fields([
    { name: "posters", maxCount: 12 },
    { name: "trailer", maxCount: 1 },
  ]),
  updateMovie,
);
router.delete("/movies/:id", deleteMovie);
router.put("/movies/:id/restore", restoreMovie);
router.delete("/movies/:id/permanent", permanentDeleteMovie);
router.put("/movies/:id/toggle-hide", toggleHideMovie);

// ─── Movie Category Management ─────────────────────────────────────────────────
router.get("/categories", getAllCategories);
router.post("/categories", createCategory);
router.get("/categories/:id", getCategoryById);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

// ─── Showtime Management ──────────────────────────────────────────────────────
router.get("/showtimes/cinemas", getShowtimeCinemas);
router.get("/showtimes/rooms", getShowtimeRooms);
router.get("/showtimes", getShowtimes);
router.get("/showtimes/:id", getShowtimeById);
router.post("/showtimes", createShowtime);
router.put("/showtimes/:id", updateShowtime);
router.delete("/showtimes/:id", deleteShowtime);
router.put("/showtimes/:id/cancel", cancelShowtime);

export default router;
