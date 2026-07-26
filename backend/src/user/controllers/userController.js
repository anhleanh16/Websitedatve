import * as CinemaModel from "../../admin/models/cinemaModel.js";
import { MovieModel } from "../../admin/models/movieModel.js";
import { BookingModel } from "../../admin/models/bookingModel.js";
import { db } from "../../../config/db.js";
import { NotificationModel } from "../../admin/models/notificationModel.js";
import { PromotionModel } from "../../admin/models/promotionModel.js";
import { NewsModel } from "../../admin/models/newsModel.js";

const normalizeCinemaImagePath = (cinema) => {
  if (!cinema) return cinema;
  const image = cinema.image;
  if (!image) return cinema;
  if (typeof image === "string" && image.startsWith("/uploads/cinema-")) {
    return {
      ...cinema,
      image: image.replace("/uploads/", "/uploads/cinemas/"),
    };
  }
  return cinema;
};

const mapMovieCategories = (movies, categoryRows) => {
  const categoriesByMovie = new Map();

  categoryRows.forEach((row) => {
    const movieId = Number(row.movie_id);
    if (!categoriesByMovie.has(movieId)) {
      categoriesByMovie.set(movieId, []);
    }
    categoriesByMovie.get(movieId).push({
      category_id: row.category_id,
      category_name: row.category_name,
    });
  });

  return movies.map((movie) => ({
    ...movie,
    categories: categoriesByMovie.get(Number(movie.movie_id)) || [],
  }));
};

export const getPublicCinemas = async (req, res) => {
  try {
    const cinemas = await CinemaModel.findAll();
    res.json({ cinemas: cinemas.map(normalizeCinemaImagePath) });
  } catch (error) {
    console.error("Error getting public cinemas:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách rạp" });
  }
};

export const getPublicCinemaById = async (req, res) => {
  try {
    const cinema = await CinemaModel.findById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: "Không tìm thấy rạp phim" });
    }

    // Nếu có showtimeId, overlay trạng thái ghế đã bán theo suất chiếu cụ thể
    const showtimeId = Number(req.query.showtimeId || 0);
    if (showtimeId > 0 && Array.isArray(cinema.rooms)) {
      // Lấy tất cả seat_code đã có ticket active trong suất chiếu này
      const [soldRows] = await db.query(
        `SELECT UPPER(s.seat_code) AS seat_code
         FROM Tickets t
         JOIN Seats s ON s.seat_id = t.seat_id
         JOIN Orders o ON o.order_id = t.order_id
         WHERE t.showtime_id = ?
           AND t.ticket_status <> 'cancelled'
           AND o.status <> 'cancelled'`,
        [showtimeId],
      );
      const soldSet = new Set(soldRows.map((r) => r.seat_code));

      // Overlay: đánh dấu ghế đã bán theo suất
      cinema.rooms = cinema.rooms.map((room) => ({
        ...room,
        seats: Array.isArray(room.seats)
          ? room.seats.map((seat) => ({
              ...seat,
              status: soldSet.has(String(seat.seat_code || "").toUpperCase())
                ? "sold"
                : seat.status,
            }))
          : [],
      }));
    }

    res.json({ cinema: normalizeCinemaImagePath(cinema) });
  } catch (error) {
    console.error(`Error getting public cinema ${req.params.id}:`, error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy chi tiết rạp" });
  }
};

export const userGetProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({ user: { id: userId, name: "", email: "" } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userGetMovies = async (req, res) => {
  try {
    await MovieModel.syncStatuses();
    const { status } = req.query;

    const params = [];
    let whereSql = "WHERE m.is_deleted = 0 AND m.is_hidden = 0";

    if (status && ["now_showing", "coming_soon"].includes(status)) {
      whereSql += " AND m.status = ?";
      params.push(status);
    }

    const [movies] = await db.query(
      `
      SELECT
        m.movie_id,
        m.title,
        m.poster,
        m.age_limit,
        m.status,
        m.release_date,
        m.duration,
        m.age_limit,
        COALESCE(
          GROUP_CONCAT(DISTINCT mc.category_name ORDER BY mc.category_name SEPARATOR ', '),
          ''
        ) AS categories,
        COALESCE(ROUND(AVG(r.rating), 1), 0) AS rating,
        COUNT(r.review_id) AS review_count
      FROM Movies m
      LEFT JOIN Movie_Category_Detail mcd ON m.movie_id = mcd.movie_id
      LEFT JOIN Movie_Categories mc ON mc.category_id = mcd.category_id
      LEFT JOIN Reviews r ON r.movie_id = m.movie_id
      ${whereSql}
      GROUP BY
        m.movie_id,
        m.title,
        m.poster,
        m.age_limit,
        m.status,
        m.release_date,
        m.duration
      ORDER BY
        CASE WHEN m.status = 'ended' THEN 1 ELSE 0 END ASC,
        m.release_date DESC,
        m.movie_id DESC
    `,
      params,
    );

    if (movies.length === 0) {
      return res.json({ movies: [] });
    }

    const movieIds = movies.map((movie) => movie.movie_id);
    const [categoryRows] = await db.query(
      `
      SELECT
        mcd.movie_id,
        mc.category_id,
        mc.category_name
      FROM Movie_Category_Detail mcd
      JOIN Movie_Categories mc ON mc.category_id = mcd.category_id
      WHERE mcd.movie_id IN (${movieIds.map(() => "?").join(", ")})
      ORDER BY mc.category_name ASC
    `,
      movieIds,
    );

    res.json({ movies: mapMovieCategories(movies, categoryRows) });
  } catch (error) {
    console.error("Error in userGetMovies:", error);
    res.status(500).json({ message: "Error getting movies", movies: [] });
  }
};

export const userGetShowtimes = async (req, res) => {
  try {
    const { cinemaId, format, date } = req.query;

    const params = [];
    let whereSql = `
      WHERE s.status = 'active'
        AND m.is_deleted = 0
        AND m.is_hidden = 0
        AND DATE(CONVERT_TZ(s.start_time, '+00:00', '+07:00')) = COALESCE(?, DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')))
    `;
    params.push(date || null);

    if (cinemaId) {
      whereSql += " AND c.cinemas_id = ?";
      params.push(cinemaId);
    }

    if (format && ["2D", "3D", "IMAX"].includes(format)) {
      whereSql += " AND r.room_type = ?";
      params.push(format);
    }

    const [showtimes] = await db.query(
      `
      SELECT
        s.showtime_id,
        s.movie_id,
        s.room_id,
        s.start_time,
        s.end_time,
        s.price,
        s.available_seats,
        m.title AS movie_title,
        m.poster,
        m.age_limit,
        m.status AS movie_status,
        c.cinemas_id AS cinema_id,
        c.cinema_name,
        c.city,
        r.room_name,
        r.room_type
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      ${whereSql}
      ORDER BY c.cinema_name ASC, m.title ASC, s.start_time ASC
    `,
      params,
    );

    res.json({ showtimes });
  } catch (error) {
    console.error("Error in userGetShowtimes:", error);
    res.status(500).json({ message: "Error getting showtimes", showtimes: [] });
  }
};

export const userGetMovieById = async (req, res) => {
  try {
    await MovieModel.syncStatuses();
    const movieId = Number(req.params.id);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      return res.status(400).json({ message: "Invalid movie id" });
    }

    const [rows] = await db.query(
      `
      SELECT *
      FROM Movies
      WHERE movie_id = ? AND is_deleted = 0 AND is_hidden = 0
      LIMIT 1
    `,
      [movieId],
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Movie not found" });
    }

    const movie = rows[0];
    const [categories] = await db.query(
      `
      SELECT mc.category_id, mc.category_name
      FROM Movie_Categories mc
      JOIN Movie_Category_Detail mcd ON mc.category_id = mcd.category_id
      WHERE mcd.movie_id = ?
    `,
      [movieId],
    );

    const [[reviewStats]] = await db.query(
      `
      SELECT
        COALESCE(ROUND(AVG(rating), 1), 0) AS average_rating,
        COUNT(*) AS review_count,
        COALESCE(ROUND(AVG(CASE WHEN rating >= 4 THEN 100 ELSE 0 END), 0), 0) AS recommended_percent
      FROM Reviews
      WHERE movie_id = ?
    `,
      [movieId],
    );

    const [reviewBreakdownRows] = await db.query(
      `
      SELECT ROUND(rating) AS star, COUNT(*) AS count
      FROM Reviews
      WHERE movie_id = ?
      GROUP BY ROUND(rating)
    `,
      [movieId],
    );

    const [showtimeRows] = await db.query(
      `
      SELECT
        s.showtime_id,
        s.room_id,
        s.start_time,
        s.end_time,
        s.price AS price_standard,
        s.price AS price_vip,
        s.price AS price_couple,
        s.available_seats,
        r.room_name,
        r.room_type,
        c.cinemas_id AS cinema_id,
        c.cinema_name
      FROM Showtimes s
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      WHERE s.movie_id = ?
        AND s.status = 'active'
        AND DATE(CONVERT_TZ(s.start_time, '+00:00', '+07:00')) BETWEEN DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')) AND DATE_ADD(DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00')), INTERVAL 6 DAY)
      ORDER BY c.cinema_name ASC, s.start_time ASC
    `,
      [movieId],
    );

    const totalReviews = Number(reviewStats?.review_count || 0);
    const breakdownMap = new Map(
      reviewBreakdownRows.map((row) => [Number(row.star), Number(row.count)]),
    );
    const rating_breakdown = [5, 4, 3, 2, 1].map((star) => {
      const count = breakdownMap.get(star) || 0;
      return {
        stars: star,
        count,
        percent: totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0,
      };
    });

    res.json({
      movie: {
        ...movie,
        posters: movie.posters ? JSON.parse(movie.posters) : [],
        categories,
        rating: Number(reviewStats?.average_rating || 0),
        review_count: totalReviews,
        recommended_percent: Number(reviewStats?.recommended_percent || 0),
        rating_breakdown,
        showtimes: showtimeRows,
      },
    });
  } catch (error) {
    console.error("Error in userGetMovieById:", error);
    res.status(500).json({ message: "Error getting movie" });
  }
};

export const userUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address } = req.body;
    res.json({ message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userGetBookings = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId || userId <= 0) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }
    const bookings = await BookingModel.findByUserId(userId);
    res.json({ bookings });
  } catch (error) {
    console.error("Error in userGetBookings:", error);
    res.status(500).json({ message: "Không thể tải danh sách vé.", bookings: [] });
  }
};

export const userCreateBooking = async (req, res) => {
  try {
    const { userId } = req.params;
    const { showtimeId, seatUnits, foodItems, paymentMethod } = req.body;

    const normalizedUserId = Number(userId || 0);
    if (!normalizedUserId) {
      return res.status(400).json({ message: "Không xác định được người dùng." });
    }

    const booking = await BookingModel.createUserBooking({
      userId: normalizedUserId,
      showtimeId,
      seatUnits,
      foodItems,
      paymentMethod,
    });

    res.status(201).json({
      success: true,
      booking,
      message: "Đặt vé thành công",
    });
  } catch (error) {
    console.error("Error in userCreateBooking:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Lỗi khi đặt vé",
    });
  }
};

export const userGetNotifications = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const rows = await NotificationModel.findByUserId(userId);
    res.json({ notifications: rows });
  } catch (error) {
    console.error("Error in userGetNotifications:", error);
    res.status(500).json({ message: "Không thể tải thông báo.", notifications: [] });
  }
};

export const userMarkNotificationRead = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const notificationId = Number(req.params.notificationId);
    const success = await NotificationModel.markAsRead(userId, notificationId);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }
    res.json({ message: "Đã đánh dấu đã đọc." });
  } catch (error) {
    console.error("Error in userMarkNotificationRead:", error);
    res.status(500).json({ message: "Không thể cập nhật trạng thái thông báo." });
  }
};

export const userMarkAllNotificationsRead = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const updatedCount = await NotificationModel.markAllAsRead(userId);
    res.json({ message: "Đã đánh dấu tất cả đã đọc.", updatedCount });
  } catch (error) {
    console.error("Error in userMarkAllNotificationsRead:", error);
    res.status(500).json({ message: "Không thể cập nhật toàn bộ thông báo." });
  }
};

export const userDeleteNotification = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const notificationId = Number(req.params.notificationId);
    const success = await NotificationModel.deleteForUser(userId, notificationId);
    if (!success) {
      return res.status(404).json({ message: "Không tìm thấy thông báo." });
    }
    res.json({ message: "Đã xóa thông báo." });
  } catch (error) {
    console.error("Error in userDeleteNotification:", error);
    res.status(500).json({ message: "Không thể xóa thông báo." });
  }
};

export const userClearNotifications = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const deletedCount = await NotificationModel.clearForUser(userId);
    res.json({ message: "Đã xóa toàn bộ thông báo.", deletedCount });
  } catch (error) {
    console.error("Error in userClearNotifications:", error);
    res.status(500).json({ message: "Không thể xóa toàn bộ thông báo." });
  }
};

export const userGetPromotions = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const data = await PromotionModel.findUserPromotions(userId);
    res.json(data);
  } catch (error) {
    console.error("Error in userGetPromotions:", error);
    res.status(500).json({
      message: "Không thể tải dữ liệu khuyến mãi.",
      coupons: [],
      vouchers: [],
    });
  }
};

export const userGetTodayPromotions = async (req, res) => {
  try {
    const coupons = await PromotionModel.findActiveCoupons();
    res.json({ coupons });
  } catch (error) {
    console.error("Error in userGetTodayPromotions:", error);
    res.status(500).json({ message: "Không thể tải khuyến mãi hôm nay", coupons: [] });
  }
};

export const validatePromoCode = async (req, res) => {
  try {
    const { code, orderAmount = 0, userId } = req.body || {};
    const trimmedCode = String(code || "").trim().toUpperCase();

    if (!trimmedCode) {
      return res.status(400).json({ valid: false, message: "Vui lòng nhập mã ưu đãi." });
    }

    const [rows] = await db.query(
      `SELECT * FROM Promotions
       WHERE UPPER(code) = ?
         AND status = 'active'
         AND (start_date IS NULL OR start_date <= CURDATE())
         AND (end_date IS NULL OR end_date >= CURDATE())
       LIMIT 1`,
      [trimmedCode],
    );

    if (!rows.length) {
      return res.status(404).json({ valid: false, message: "Mã không hợp lệ hoặc đã hết hạn." });
    }

    const promo = rows[0];

    // Kiểm tra số lần sử dụng
    if (Number(promo.usage_limit) > 0 && Number(promo.used_count) >= Number(promo.usage_limit)) {
      return res.status(400).json({ valid: false, message: "Mã đã hết lượt sử dụng." });
    }

    // Kiểm tra đơn tối thiểu
    const minOrder = Number(promo.min_order || 0);
    if (minOrder > 0 && Number(orderAmount) < minOrder) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng tối thiểu ${minOrder.toLocaleString("vi-VN")}đ để dùng mã này.`,
      });
    }

    // Kiểm tra voucher riêng tư (promotion_type = 'voucher') phải đúng user
    if (promo.promotion_type === "voucher" && userId) {
      const [assignment] = await db.query(
        `SELECT * FROM User_Promotions
         WHERE promotion_id = ? AND user_id = ? AND status = 'active'
         LIMIT 1`,
        [promo.promotion_id, Number(userId)],
      );
      if (!assignment.length) {
        return res.status(403).json({ valid: false, message: "Voucher này không dành cho tài khoản của bạn." });
      }
    }

    // Tính discount
    const discountType = promo.discount_type || "percent";
    const discountValue = Number(promo.discount_value || 0);
    const amount = Number(orderAmount || 0);
    let discountAmount = 0;

    if (discountType === "percent") {
      discountAmount = Math.round(amount * discountValue / 100);
    } else {
      discountAmount = discountValue;
    }

    // Giới hạn max discount
    const maxDiscount = Number(promo.max_discount || 0);
    if (maxDiscount > 0 && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }

    return res.json({
      valid: true,
      message: `Áp dụng thành công! Giảm ${discountType === "percent" ? `${discountValue}%` : `${discountValue.toLocaleString("vi-VN")}đ`}.`,
      promo: {
        id: promo.promotion_id,
        code: promo.code,
        discountType,
        discountValue,
        discountAmount,
        maxDiscount,
        description: promo.description || "",
      },
    });
  } catch (error) {
    console.error("Error in validatePromoCode:", error);
    res.status(500).json({ valid: false, message: "Không thể kiểm tra mã ưu đãi." });
  }
};

export const userGetNews = async (req, res) => {
  try {
    const { search = "", category = "", limit } = req.query;
    const news = await NewsModel.findPublic({ search, category, limit });
    const trendingSource = await NewsModel.findPublic({ limit: 12 });
    const featured = news[0] || trendingSource[0] || null;
    const trending = [...trendingSource]
      .sort((a, b) => {
        const viewDiff = Number(b.view_count || 0) - Number(a.view_count || 0);
        if (viewDiff !== 0) return viewDiff;
        return new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at);
      })
      .slice(0, 5);

    res.json({ featured, news, trending });
  } catch (error) {
    console.error("Error in userGetNews:", error);
    res.status(500).json({
      message: "Không thể tải danh sách tin tức.",
      featured: null,
      news: [],
      trending: [],
    });
  }
};

export const userGetNewsBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      return res.status(400).json({ message: "Slug bài viết không hợp lệ." });
    }

    const article = await NewsModel.findPublicBySlugAndIncreaseView(slug);
    if (!article) {
      return res.status(404).json({ message: "Không tìm thấy bài viết." });
    }

    const related = (await NewsModel.findPublic({ category: article.category, limit: 4 }))
      .filter((item) => item.slug !== article.slug)
      .slice(0, 3);

    res.json({ article, related });
  } catch (error) {
    console.error("Error in userGetNewsBySlug:", error);
    res.status(500).json({ message: "Không thể tải chi tiết bài viết.", article: null, related: [] });
  }
};

export const userGetCombos = async (req, res) => {
  try {
    const [combos] = await db.query(
      `SELECT * FROM Combos WHERE is_active = 1 ORDER BY sort_order ASC, combo_id ASC`,
    );

    const formattedCombos = combos.map((combo) => ({
      combo_id: combo.combo_id,
      combo_name: combo.combo_name,
      description: combo.description,
      price: combo.price,
      image: combo.image,
      category: combo.category,
      popcorn_quantity: combo.popcorn_quantity,
      drink_quantity: combo.drink_quantity,
      popcorn_options: combo.popcorn_options ? JSON.parse(combo.popcorn_options) : [],
      drink_options: combo.drink_options ? JSON.parse(combo.drink_options) : [],
    }));

    res.json({ combos: formattedCombos });
  } catch (error) {
    console.error("Error in userGetCombos:", error);
    res.status(500).json({ message: "Không thể tải danh sách combo", combos: [] });
  }
};
