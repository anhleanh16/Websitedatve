import {
  getAllCinemas,
  getCinemaById,
  createCinema,
  updateCinema,
  deleteCinema,
  getRoomsByCinema,
  getSeatsByRoom,
  bulkUpdateSeats,
} from "../controllers/cinemaController.js";
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
import { uploadMovieFiles, uploadCinemaImage } from "../../../config/upload.js";

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

// ─── Cinema Management ────────────────────────────────────────────────────────
router.get("/cinemas", getAllCinemas);
router.get("/cinemas/:id", getCinemaById);
router.post("/cinemas", uploadCinemaImage.single("image"), createCinema);
router.put("/cinemas/:id", uploadCinemaImage.single("image"), updateCinema);
router.delete("/cinemas/:id", deleteCinema);

// ─── Rooms / Seats Management ─────────────────────────────────────────────────
router.get("/rooms", getRoomsByCinema);
router.get("/seats", getSeatsByRoom);
router.put("/seats/bulk", bulkUpdateSeats);

export default router;
