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
  createRecurringShowtime,
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
import {
  getAdminNotifications,
  getAdminNotificationDetail,
  getNotificationRecipients,
  createAdminNotification,
  updateAdminNotification,
  deleteAdminNotification,
} from "../controllers/notificationController.js";
import {
  getAdminPromotions,
  getPromotionRecipients,
  createCoupon,
  updateCoupon,
  createVoucher,
  updateVoucher,
  deletePromotion,
} from "../controllers/promotionController.js";
import {
  getAdminNews,
  getAdminNewsById,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
} from "../controllers/newsController.js";
import { uploadMovieFiles, uploadCinemaImage, uploadNewsImage } from "../../../config/upload.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", getDashboardStats);

// ─── User Management ─────────────────────────────────────────────────────────
router.get("/users", getAdminUsers);
router.put("/users/:userId/deactivate", deactivateAdminUser);

// ─── Notifications Management ────────────────────────────────────────────────
router.get("/notifications", authMiddleware, adminOnly, getAdminNotifications);
router.get("/notifications/recipients", authMiddleware, adminOnly, getNotificationRecipients);
router.get("/notifications/:id", authMiddleware, adminOnly, getAdminNotificationDetail);
router.post("/notifications", authMiddleware, adminOnly, createAdminNotification);
router.put("/notifications/:id", authMiddleware, adminOnly, updateAdminNotification);
router.delete("/notifications/:id", authMiddleware, adminOnly, deleteAdminNotification);

// ─── Promotions Management ───────────────────────────────────────────────────
router.get("/promotions", authMiddleware, adminOnly, getAdminPromotions);
router.get("/promotions/recipients", authMiddleware, adminOnly, getPromotionRecipients);
router.post("/promotions/coupons", authMiddleware, adminOnly, createCoupon);
router.put("/promotions/coupons/:id", authMiddleware, adminOnly, updateCoupon);
router.post("/promotions/vouchers", authMiddleware, adminOnly, createVoucher);
router.put("/promotions/vouchers/:id", authMiddleware, adminOnly, updateVoucher);
router.delete("/promotions/:id", authMiddleware, adminOnly, deletePromotion);

// ─── News Management ──────────────────────────────────────────────────────────
router.get("/news", authMiddleware, adminOnly, getAdminNews);
router.get("/news/:id", authMiddleware, adminOnly, getAdminNewsById);
router.post("/news", authMiddleware, adminOnly, uploadNewsImage.single("thumbnailFile"), createAdminNews);
router.put("/news/:id", authMiddleware, adminOnly, uploadNewsImage.single("thumbnailFile"), updateAdminNews);
router.delete("/news/:id", authMiddleware, adminOnly, deleteAdminNews);

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
router.post("/showtimes/recurring", createRecurringShowtime);
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
