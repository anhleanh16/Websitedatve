import * as CinemaModel from "../../admin/models/cinemaModel.js";
import { MovieModel } from "../../admin/models/movieModel.js";
import { BookingModel } from "../../admin/models/bookingModel.js";
import { db } from "../../../config/db.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NotificationModel } from "../../admin/models/notificationModel.js";
import { PromotionModel } from "../../admin/models/promotionModel.js";
import { NewsModel } from "../../admin/models/newsModel.js";
import { sendTicketQrEmail } from '../services/ticketEmailService.js';
import { BIRTH_DATE_ERROR, isValidBirthDate } from '../../utils/birthDate.js';
import {
  isEmailVerificationConfigured,
  sendEmailChangeOtpEmail,
} from '../../admin/services/emailVerificationService.js';

const EMAIL_CHANGE_OTP_TTL_MINUTES = 5;
const EMAIL_CHANGE_OTP_RESEND_COOLDOWN_SECONDS = 30;
const PROFILE_AUDIT_MAX_LIMIT = 50;
const isUnlinkedEmail = (email) => String(email || '').toLowerCase().endsWith('@unlinked.local');
const makeEmailOtpToken = (userId, otpCode) =>
  crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'sweetstar-email-otp')
    .update(`${userId}:${otpCode}`)
    .digest('hex');
let profileSchemaReadyPromise = null;

const ensureColumn = async (tableName, columnName, definitionSql) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName]);
  if (rows.length === 0) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  }
};

const ensureUserProfileSchema = async () => {
  if (profileSchemaReadyPromise) {
    await profileSchemaReadyPromise;
    return;
  }

  profileSchemaReadyPromise = (async () => {
    await ensureColumn('User', 'pending_email', 'VARCHAR(100) NULL AFTER email');
    await ensureColumn('User', 'email_change_otp', 'VARCHAR(10) NULL AFTER pending_email');
    await ensureColumn('User', 'email_change_otp_token', 'VARCHAR(128) NULL AFTER email_change_otp');
    await ensureColumn('User', 'email_change_expires', 'DATETIME NULL AFTER email_change_otp_token');
    await ensureColumn('User', 'email_change_requested_at', 'DATETIME NULL AFTER email_change_expires');

    await db.query(`
      CREATE TABLE IF NOT EXISTS User_Profile_Audits (
        audit_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        changed_by INT NULL,
        action VARCHAR(50) NOT NULL,
        field_changes TEXT NULL,
        ip_address VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_profile_audits_user_time (user_id, created_at),
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
      )
    `);
  })();

  try {
    await profileSchemaReadyPromise;
  } catch (error) {
    profileSchemaReadyPromise = null;
    throw error;
  }
};

const buildChanges = (before, after) => {
  const changes = {};
  for (const key of Object.keys(after)) {
    const prev = before[key] ?? null;
    const next = after[key] ?? null;
    if (String(prev) !== String(next)) {
      changes[key] = { before: prev, after: next };
    }
  }
  return changes;
};

const logProfileAudit = async (req, {
  userId,
  action,
  changedBy = null,
  changes = null,
}) => {
  await ensureUserProfileSchema();
  const ipAddress = String(req.headers['x-forwarded-for'] || req.ip || '').slice(0, 64);
  const userAgent = String(req.headers['user-agent'] || '').slice(0, 255);
  const fieldChanges = changes && Object.keys(changes).length > 0 ? JSON.stringify(changes) : null;

  await db.query(
    `
      INSERT INTO User_Profile_Audits (user_id, changed_by, action, field_changes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      Number(userId),
      changedBy ? Number(changedBy) : null,
      String(action || 'profile_update'),
      fieldChanges,
      ipAddress || null,
      userAgent || null,
    ],
  );
};

const sendBookingSuccessNotification = async ({ userId, booking }) => {
  const normalizedUserId = Number(userId || 0);
  if (!normalizedUserId || !booking) return;

  const movieTitle = String(booking.movie_title || 'phim đã chọn');
  const bookingCode = String(booking.booking_code || '').trim();
  const showDate = booking.start_time
    ? new Date(booking.start_time).toLocaleString('vi-VN')
    : '';
  const seatCodes = String(booking.seats?.join?.(', ') || booking.seat_codes || '').trim();
  const dedupeCode = String(bookingCode || booking.booking_id || '').trim();

  const contentParts = [
    `Bạn đã đặt vé thành công cho \"${movieTitle}\".`,
    bookingCode ? `Mã vé: ${bookingCode}.` : '',
    showDate ? `Suất chiếu: ${showDate}.` : '',
    seatCodes ? `Ghế: ${seatCodes}.` : '',
  ].filter(Boolean);

  await NotificationModel.createForUser({
    userId: normalizedUserId,
    title: 'Đặt vé thành công',
    content: contentParts.join(' '),
    type: 'booking',
    dedupeKey: dedupeCode ? `booking_success:${dedupeCode}` : null,
  });
};

const normalizeRoleName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');

const STAFF_ROLE_BLOCKLIST = new Set([
  'admin',
  'staff',
  'manager',
  'technician',
  'employee',
  'quanly',
  'nhanvien',
]);

const isCustomerRoleName = (roleName) => {
  const normalized = normalizeRoleName(roleName);
  if (!normalized) return true;
  return !STAFF_ROLE_BLOCKLIST.has(normalized);
};

const getRoleNameByUserId = async (userId) => {
  const [[row]] = await db.query(
    `
    SELECT COALESCE(r.role_name, '') AS role_name
    FROM User u
    LEFT JOIN Roles r ON r.role_id = u.role_id
    WHERE u.id = ?
    LIMIT 1
  `,
    [Number(userId || 0)],
  );

  return String(row?.role_name || '');
};

const ensureCustomerBookingAccess = async (req, userId) => {
  const requesterId = Number(req.userId || 0);
  const targetUserId = Number(userId || 0);

  if (!requesterId || requesterId !== targetUserId) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Bạn chỉ có thể thao tác đặt vé trên chính tài khoản của mình.',
    };
  }

  const roleName = await getRoleNameByUserId(targetUserId);
  if (!isCustomerRoleName(roleName)) {
    return {
      allowed: false,
      statusCode: 403,
      message: 'Chỉ tài khoản khách hàng mới có quyền đặt vé và tích điểm.',
    };
  }

  return { allowed: true };
};

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

const normalizeMoviePosters = (posters) => {
  if (!posters) return [];
  if (Array.isArray(posters)) return posters.filter(Boolean);
  if (typeof posters === "string") {
    try {
      const parsed = JSON.parse(posters);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
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
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const [[user]] = await db.query(
      `
      SELECT
        id,
        full_name,
        email,
        email_verified,
        pending_email,
        email_change_expires,
        email_change_requested_at,
        phone,
        birthday,
        sex,
        avatar,
        point,
        status,
        updated_at,
        created_at
      FROM User
      WHERE id = ?
      LIMIT 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy hồ sơ người dùng." });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.full_name,
        email: isUnlinkedEmail(user.email) ? "" : user.email,
        email_verified: Boolean(user.email_verified) && !isUnlinkedEmail(user.email),
        pending_email: user.pending_email || "",
        email_change_expires: user.email_change_expires,
        email_change_requested_at: user.email_change_requested_at,
        phone: user.phone || "",
        birthday: user.birthday,
        sex: user.sex,
        avatar: user.avatar || "",
        point: Number(user.point || 0),
        status: user.status,
        updated_at: user.updated_at,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error("Error in userGetProfile:", error);
    res.status(500).json({ message: "Không thể tải hồ sơ người dùng." });
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

    // Kiểm tra DB có cột price_standard/vip/couple riêng không
    const [showtimeCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Showtimes'",
    );
    const showtimeColSet = new Set(showtimeCols.map((c) => c.COLUMN_NAME));
    const priceStandardExpr = showtimeColSet.has("price_standard")
      ? "COALESCE(s.price_standard, s.price)"
      : "s.price";
    const priceVipExpr = showtimeColSet.has("price_vip")
      ? "COALESCE(s.price_vip, s.price)"
      : priceStandardExpr;
    const priceCoupleExpr = showtimeColSet.has("price_couple")
      ? "COALESCE(s.price_couple, s.price)"
      : priceStandardExpr;

    const [showtimeRows] = await db.query(
      `
      SELECT
        s.showtime_id,
        s.room_id,
        s.start_time,
        s.end_time,
        ${priceStandardExpr} AS price_standard,
        ${priceVipExpr} AS price_vip,
        ${priceCoupleExpr} AS price_couple,
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
        AND DATE(CONVERT_TZ(s.start_time, '+00:00', '+07:00')) >= DATE(CONVERT_TZ(NOW(), '+00:00', '+07:00'))
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
        posters: normalizeMoviePosters(movie.posters),
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
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const { name, email, phone, birthday, sex } = req.body || {};

    const trimmedName = String(name || "").trim();
    const trimmedEmail = String(email || "").trim().toLowerCase();
    const trimmedPhone = String(phone || "").trim();
    const normalizedBirthday = birthday ? String(birthday).slice(0, 10) : null;
    const normalizedSex = ["Nam", "Nu", "Khac"].includes(String(sex || ""))
      ? String(sex)
      : null;

    if (normalizedBirthday && !isValidBirthDate(normalizedBirthday)) {
      return res.status(400).json({ message: BIRTH_DATE_ERROR });
    }

    if (!trimmedName) {
      return res.status(400).json({ message: "Họ tên là bắt buộc." });
    }

    const [[currentUser]] = await db.query(
      "SELECT id, full_name, email, phone, birthday, sex FROM User WHERE id = ? LIMIT 1",
      [userId],
    );

    if (!currentUser) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const currentEmail = String(currentUser.email || '').trim().toLowerCase();
    if (!trimmedEmail && !isUnlinkedEmail(currentEmail)) {
      return res.status(400).json({ message: "Email không được để trống." });
    }

    if (trimmedEmail && trimmedEmail !== currentEmail) {
      return res.status(400).json({
        message: "Để đổi email, vui lòng dùng chức năng xác minh OTP email mới.",
        requiresEmailVerification: true,
      });
    }

    await db.query(
      `
      UPDATE User
      SET full_name = ?,
          email = ?,
          phone = ?,
          birthday = ?,
          sex = ?,
          updated_at = NOW()
      WHERE id = ?
    `,
      [
        trimmedName,
        trimmedEmail || currentUser.email,
        trimmedPhone || null,
        normalizedBirthday,
        normalizedSex,
        userId,
      ],
    );

    const [[updatedUser]] = await db.query(
      `
      SELECT id, full_name, email, phone, birthday, sex, avatar, point, status, updated_at
      FROM User
      WHERE id = ?
      LIMIT 1
    `,
      [userId],
    );

    const changes = buildChanges(
      {
        full_name: currentUser.full_name,
        email: currentUser.email,
        phone: currentUser.phone,
        birthday: currentUser.birthday,
        sex: currentUser.sex,
      },
      {
        full_name: updatedUser.full_name,
        email: isUnlinkedEmail(updatedUser.email) ? "" : updatedUser.email,
        phone: updatedUser.phone,
        birthday: updatedUser.birthday,
        sex: updatedUser.sex,
      },
    );

    if (Object.keys(changes).length > 0) {
      await logProfileAudit(req, {
        userId,
        changedBy: req.userId,
        action: 'profile_updated',
        changes,
      });
    }

    return res.json({
      message: "Cập nhật hồ sơ thành công.",
      user: {
        id: updatedUser.id,
        name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone || "",
        birthday: updatedUser.birthday,
        sex: updatedUser.sex,
        avatar: updatedUser.avatar || "",
        point: Number(updatedUser.point || 0),
        status: updatedUser.status,
        updated_at: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in userUpdateProfile:", error);
    res.status(500).json({ message: "Không thể cập nhật hồ sơ." });
  }
};

export const userChangePassword = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const { currentPassword, newPassword } = req.body || {};
    const current = String(currentPassword || "");
    const next = String(newPassword || "");

    if (!current || !next) {
      return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới." });
    }

    if (next.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải ít nhất 6 ký tự." });
    }

    const [[user]] = await db.query(
      "SELECT id, password FROM User WHERE id = ? LIMIT 1",
      [userId],
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const matched = await bcrypt.compare(current, String(user.password || ""));
    if (!matched) {
      return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
    }

    const hashed = await bcrypt.hash(next, 10);
    await db.query(
      "UPDATE User SET password = ?, updated_at = NOW() WHERE id = ?",
      [hashed, userId],
    );

    await logProfileAudit(req, {
      userId,
      changedBy: req.userId,
      action: 'password_changed',
      changes: { password: { before: '***', after: '***' } },
    });

    return res.json({ message: "Đổi mật khẩu thành công." });
  } catch (error) {
    console.error("Error in userChangePassword:", error);
    return res.status(500).json({ message: "Không thể đổi mật khẩu lúc này." });
  }
};

export const userUpdateAvatar = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn ảnh đại diện." });
    }

    const avatarPath = `/uploads/staff/${req.file.filename}`;

    const [[currentUser]] = await db.query(
      "SELECT avatar FROM User WHERE id = ? LIMIT 1",
      [userId],
    );

    await db.query(
      "UPDATE User SET avatar = ?, updated_at = NOW() WHERE id = ?",
      [avatarPath, userId],
    );

    await logProfileAudit(req, {
      userId,
      changedBy: req.userId,
      action: 'avatar_updated',
      changes: buildChanges(
        { avatar: currentUser?.avatar || null },
        { avatar: avatarPath },
      ),
    });

    return res.json({
      message: "Cập nhật ảnh đại diện thành công.",
      avatar: avatarPath,
    });
  } catch (error) {
    console.error("Error in userUpdateAvatar:", error);
    return res.status(500).json({ message: "Không thể cập nhật ảnh đại diện." });
  }
};

export const userRemoveAvatar = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const [[currentUser]] = await db.query(
      "SELECT avatar FROM User WHERE id = ? LIMIT 1",
      [userId],
    );

    await db.query(
      "UPDATE User SET avatar = NULL, updated_at = NOW() WHERE id = ?",
      [userId],
    );

    await logProfileAudit(req, {
      userId,
      changedBy: req.userId,
      action: 'avatar_removed',
      changes: buildChanges(
        { avatar: currentUser?.avatar || null },
        { avatar: null },
      ),
    });

    return res.json({ message: "Đã xoá ảnh đại diện.", avatar: "" });
  } catch (error) {
    console.error("Error in userRemoveAvatar:", error);
    return res.status(500).json({ message: "Không thể xoá ảnh đại diện." });
  }
};

export const userRequestEmailChangeOtp = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const newEmail = String(req.body?.newEmail || '').trim().toLowerCase();
    if (!newEmail) {
      return res.status(400).json({ message: "Vui lòng nhập email mới." });
    }

    if (!isEmailVerificationConfigured()) {
      return res.status(500).json({
        message: "Thiếu cấu hình SMTP để gửi OTP đổi email.",
      });
    }

    const [[currentUser]] = await db.query(
      "SELECT id, full_name, email, email_verified, email_change_requested_at FROM User WHERE id = ? LIMIT 1",
      [userId],
    );

    if (!currentUser) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    const lastRequestedAt = currentUser.email_change_requested_at
      ? new Date(currentUser.email_change_requested_at).getTime()
      : 0;
    const cooldownEndsAt = lastRequestedAt + EMAIL_CHANGE_OTP_RESEND_COOLDOWN_SECONDS * 1000;
    if (lastRequestedAt && Date.now() < cooldownEndsAt) {
      const retryAfterSeconds = Math.max(1, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      return res.status(429).json({
        message: `Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi lại mã OTP.`,
        retryAfterSeconds,
      });
    }

    const currentEmail = String(currentUser.email || '').trim().toLowerCase();
    const isVerifyingRegisteredEmail = newEmail === currentEmail && Number(currentUser.email_verified || 0) !== 1;
    if (newEmail === currentEmail && !isVerifyingRegisteredEmail) {
      return res.status(400).json({ message: "Email mới trùng với email hiện tại." });
    }

    const [[emailOwner]] = await db.query(
      "SELECT id FROM User WHERE LOWER(email) = ? LIMIT 1",
      [newEmail],
    );

    if (emailOwner && Number(emailOwner.id) !== userId) {
      return res.status(409).json({ message: "Email này đã được sử dụng." });
    }

    const otpCode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const otpToken = makeEmailOtpToken(userId, otpCode);
    const expiresAt = new Date(Date.now() + EMAIL_CHANGE_OTP_TTL_MINUTES * 60 * 1000);

    await db.query(
      `
      UPDATE User
      SET pending_email = ?,
          email_change_otp = NULL,
          email_change_otp_token = ?,
          email_change_expires = ?,
          email_change_requested_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `,
      [newEmail, otpToken, expiresAt, userId],
    );

    await sendEmailChangeOtpEmail({
      toEmail: newEmail,
      fullName: currentUser.full_name,
      otpCode,
      ttlMinutes: EMAIL_CHANGE_OTP_TTL_MINUTES,
    });

    await logProfileAudit(req, {
      userId,
      changedBy: req.userId,
      action: 'email_change_otp_requested',
      changes: {
        email: {
          before: currentUser.email,
          after: newEmail,
        },
      },
    });

    return res.json({
      message: "Đã gửi OTP xác minh đến email mới.",
      pendingEmail: newEmail,
      expiresInSeconds: EMAIL_CHANGE_OTP_TTL_MINUTES * 60,
      resendCooldownSeconds: EMAIL_CHANGE_OTP_RESEND_COOLDOWN_SECONDS,
    });
  } catch (error) {
    console.error("Error in userRequestEmailChangeOtp:", error);
    return res.status(500).json({ message: "Không thể gửi OTP đổi email lúc này." });
  }
};

export const userConfirmEmailChangeOtp = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const otpCode = String(req.body?.otpCode || '').trim();
    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      return res.status(400).json({ message: "OTP không hợp lệ. Vui lòng nhập 6 chữ số." });
    }

    const [[user]] = await db.query(
      `
      SELECT id, full_name, email, pending_email, email_change_otp_token, email_change_expires, phone, birthday, sex, avatar, point, status
      FROM User
      WHERE id = ?
      LIMIT 1
    `,
      [userId],
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản." });
    }

    if (!user.pending_email || !user.email_change_otp_token || !user.email_change_expires) {
      return res.status(400).json({ message: "Không có yêu cầu đổi email đang chờ xác minh." });
    }

    if (new Date(user.email_change_expires).getTime() < Date.now()) {
      return res.status(400).json({ message: "Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại OTP." });
    }

    const expectedToken = makeEmailOtpToken(userId, otpCode);
    const savedToken = String(user.email_change_otp_token || '');
    const tokenMatches =
      savedToken.length === expectedToken.length &&
      crypto.timingSafeEqual(Buffer.from(savedToken), Buffer.from(expectedToken));
    if (!tokenMatches) {
      return res.status(400).json({ message: "Mã OTP không đúng." });
    }

    const pendingEmail = String(user.pending_email || '').trim().toLowerCase();
    const [[emailOwner]] = await db.query(
      "SELECT id FROM User WHERE LOWER(email) = ? AND id <> ? LIMIT 1",
      [pendingEmail, userId],
    );
    if (emailOwner) {
      return res.status(409).json({ message: "Email này đã được sử dụng." });
    }

    await db.query(
      `
      UPDATE User
      SET email = ?,
          pending_email = NULL,
          email_change_otp = NULL,
          email_change_otp_token = NULL,
          email_change_expires = NULL,
          email_change_requested_at = NULL,
          email_verified = 1,
          email_verified_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `,
      [pendingEmail, userId],
    );

    await logProfileAudit(req, {
      userId,
      changedBy: req.userId,
      action: 'email_changed_verified',
      changes: {
        email: {
          before: user.email,
          after: pendingEmail,
        },
      },
    });

    return res.json({
      message: "Đổi email thành công.",
      user: {
        id: user.id,
        name: user.full_name,
        email: pendingEmail,
        email_verified: true,
        phone: user.phone || "",
        birthday: user.birthday,
        sex: user.sex,
        avatar: user.avatar || "",
        point: Number(user.point || 0),
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error in userConfirmEmailChangeOtp:", error);
    return res.status(500).json({ message: "Không thể xác minh OTP đổi email." });
  }
};

export const userGetProfileAuditLogs = async (req, res) => {
  try {
    await ensureUserProfileSchema();
    const userId = Number(req.params.userId || 0);
    if (!userId) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ." });
    }

    const limitRaw = Number(req.query.limit || 20);
    const limit = Math.min(Math.max(limitRaw || 20, 1), PROFILE_AUDIT_MAX_LIMIT);

    const [rows] = await db.query(
      `
      SELECT audit_id, user_id, changed_by, action, field_changes, ip_address, user_agent, created_at
      FROM User_Profile_Audits
      WHERE user_id = ?
      ORDER BY created_at DESC, audit_id DESC
      LIMIT ?
    `,
      [userId, limit],
    );

    const audits = rows.map((row) => ({
      ...row,
      field_changes: row.field_changes ? JSON.parse(row.field_changes) : null,
    }));

    return res.json({ audits });
  } catch (error) {
    console.error("Error in userGetProfileAuditLogs:", error);
    return res.status(500).json({ message: "Không thể tải lịch sử chỉnh sửa." });
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

export const userGetBookingDetail = async (req, res) => {
  try {
    const userId  = Number(req.params.userId);
    const orderId = Number(req.params.orderId);
    if (!orderId) return res.status(400).json({ message: "Thiếu orderId." });

    const booking = await BookingModel.findById(orderId);
    if (!booking) return res.status(404).json({ message: "Không tìm thấy vé." });
    if (Number(booking.user_id) !== userId) {
      return res.status(403).json({ message: "Không có quyền xem vé này." });
    }
    res.json({ booking });
  } catch (error) {
    console.error("Error in userGetBookingDetail:", error);
    res.status(500).json({ message: "Lỗi khi lấy chi tiết vé" });
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

    const access = await ensureCustomerBookingAccess(req, normalizedUserId);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ success: false, message: access.message });
    }

    const booking = await BookingModel.createUserBooking({
      userId: normalizedUserId,
      showtimeId,
      seatUnits,
      foodItems,
      paymentMethod,
    });

    if (String(booking?.payment_status || '').toLowerCase() === 'paid') {
      try {
        await sendBookingSuccessNotification({ userId: normalizedUserId, booking });
      } catch (notifyError) {
        console.warn('Booking notification send failed (create booking):', notifyError.message);
      }
    }

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

export const userConfirmCardPayment = async (req, res) => {
  try {
    const userId = Number(req.params.userId || 0);
    const orderId = Number(req.params.orderId || 0);

    if (!userId) return res.status(400).json({ success: false, message: "Không xác định được người dùng." });
    if (!orderId) return res.status(400).json({ success: false, message: "Không xác định được đơn hàng." });

    const access = await ensureCustomerBookingAccess(req, userId);
    if (!access.allowed) {
      return res.status(access.statusCode).json({ success: false, message: access.message });
    }

    const booking = await BookingModel.confirmCardPayment({ orderId, userId });
    let emailSent = false;
    let notificationSent = false;

    try {
      await sendBookingSuccessNotification({ userId, booking });
      notificationSent = true;
    } catch (notifyError) {
      console.warn('Booking notification send failed (card payment):', notifyError.message);
    }

    try {
      const emailResult = await sendTicketQrEmail(booking);
      emailSent = Boolean(emailResult?.sent);
    } catch (mailError) {
      console.warn('Ticket email send failed (card payment):', mailError.message);
    }

    res.json({
      success: true,
      booking,
      emailSent,
      notificationSent,
      message: "Thanh toán thẻ thành công",
    });
  } catch (error) {
    console.error("Error in userConfirmCardPayment:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || "Lỗi xác nhận thanh toán thẻ",
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
