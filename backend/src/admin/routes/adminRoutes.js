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
  staffCreateBooking,
} from "../controllers/bookingController.js";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById,
} from "../controllers/categoryController.js";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { getStatistics } from "../controllers/statisticsController.js";
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
  searchAdminUsers,
  createAdminUser,
  deactivateAdminUser,
  resetAdminUserPassword,
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
  uploadNewsInlineImage,
} from "../controllers/newsController.js";
import {
  getAdminCombos,
  getAdminComboById,
  createAdminCombo,
  updateAdminCombo,
  deleteAdminCombo,
} from "../controllers/comboController.js";
import { uploadMovieFilesMiddleware, uploadCinemaImage, uploadNewsImage, uploadCkeditorNewsImage } from "../../../config/upload.js";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/dashboard", getDashboardStats);

// ─── Statistics ───────────────────────────────────────────────────────────────
router.get("/statistics", getStatistics);

// ─── User Management ─────────────────────────────────────────────────────────
router.get("/users", getAdminUsers);
router.get("/users/search", searchAdminUsers);
router.post("/users", authMiddleware, adminOnly, createAdminUser);
router.put("/users/:userId/deactivate", deactivateAdminUser);
router.put("/users/:userId/reset-password", authMiddleware, adminOnly, resetAdminUserPassword);

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
router.post("/news/upload-image", authMiddleware, adminOnly, uploadCkeditorNewsImage.single("upload"), uploadNewsInlineImage);
router.get("/news", authMiddleware, adminOnly, getAdminNews);
router.get("/news/:id", authMiddleware, adminOnly, getAdminNewsById);
router.post("/news", authMiddleware, adminOnly, uploadNewsImage.single("thumbnailFile"), createAdminNews);
router.put("/news/:id", authMiddleware, adminOnly, uploadNewsImage.single("thumbnailFile"), updateAdminNews);
router.delete("/news/:id", authMiddleware, adminOnly, deleteAdminNews);

// Upload inline image for CKEditor news body (Word-style inline images)
// CKEditor expects response JSON: { url: "/uploads/..." }  (or { default: "..." })
router.post(
  "/upload/ckeditor-image",
  authMiddleware,
  adminOnly,
  uploadCkeditorNewsImage.single("upload"),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { message: "Không nhận được file ảnh." } });
      }
      const url = `/uploads/news/inline/${req.file.filename}`;
      res.json({
        url,
        // Also return "default" for SimpleUploadAdapter compatibility
        default: url,
      });
    } catch (e) {
      console.error("CKEditor upload error:", e);
      res.status(500).json({ error: { message: e.message || "Không thể upload ảnh." } });
    }
  }
);

// ─── Combo Management ─────────────────────────────────────────────────────────
router.get("/combos", authMiddleware, adminOnly, getAdminCombos);
router.get("/combos/:id", authMiddleware, adminOnly, getAdminComboById);
router.post("/combos", authMiddleware, adminOnly, createAdminCombo);
router.put("/combos/:id", authMiddleware, adminOnly, updateAdminCombo);
router.delete("/combos/:id", authMiddleware, adminOnly, deleteAdminCombo);

// ─── Booking Management ──────────────────────────────────────────────────────
router.get("/bookings", getAdminBookings);
router.get("/bookings/verify/:code", verifyBookingCode);
router.post("/bookings/staff-create", authMiddleware, adminOnly, staffCreateBooking);
router.get("/bookings/:orderId", getAdminBookingDetail);
router.put("/bookings/:orderId/refund", refundBooking);
router.put("/bookings/:orderId/check-in", checkInBooking);

// ─── Movie Management ─────────────────────────────────────────────────────────
router.get("/movies", getAdminMovies);

// Middleware to log form data before processing
const logFormData = (req, res, next) => {
  console.log("=== Incoming request to movie route ===");
  console.log("Method:", req.method);
  console.log("Headers:", Object.keys(req.headers));
  
  // Since it's multipart, we can't easily log body here, but multer will handle it
  next();
};

router.post(
  "/movies",
  logFormData,
  uploadMovieFilesMiddleware,
  // Middleware để tổ chức lại files cho đúng định dạng cũ
  (req, res, next) => {
    // Tổ chức lại files theo đúng field
    if (req.files && Array.isArray(req.files)) {
      req.files = {
        posters: req.files.filter(f => f.fieldname === 'posters'),
        trailer: req.files.filter(f => f.fieldname === 'trailer'),
      };
    }
    next();
  },
  createMovie,
);
router.put(
  "/movies/:id",
  logFormData,
  uploadMovieFilesMiddleware,
  // Middleware để tổ chức lại files cho đúng định dạng cũ
  (req, res, next) => {
    // Tổ chức lại files theo đúng field
    if (req.files && Array.isArray(req.files)) {
      req.files = {
        posters: req.files.filter(f => f.fieldname === 'posters'),
        trailer: req.files.filter(f => f.fieldname === 'trailer'),
      };
    }
    next();
  },
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
router.get("/showtimes/:id/sold-seats", async (req, res) => {
  try {
    const { db } = await import("../../../config/db.js");
    const showtimeId = Number(req.params.id);
    if (!showtimeId) return res.status(400).json({ soldSeats: [] });
    const [rows] = await db.query(
      `SELECT UPPER(s.seat_code) AS seat_code
       FROM Tickets t
       JOIN Seats s ON s.seat_id = t.seat_id
       JOIN Orders o ON o.order_id = t.order_id
       WHERE t.showtime_id = ?
         AND t.ticket_status <> 'cancelled'
         AND o.status <> 'cancelled'`,
      [showtimeId],
    );
    res.json({ soldSeats: rows.map(r => r.seat_code) });
  } catch (err) {
    console.error("Error in sold-seats:", err);
    res.status(500).json({ soldSeats: [] });
  }
});
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
