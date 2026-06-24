import { db } from "../../../config/db.js";

const CLEANUP_BUFFER_MINUTES = 20;
const ACTIVE_SHOWTIME_STATUS = "active";
const ENDED_SHOWTIME_STATUS = "ended";
const CANCELLED_SHOWTIME_STATUS = "cancelled";

const buildAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildComputedStatusSql = (statusColumn = "s.status", endTimeColumn = "s.end_time") =>
  `CASE WHEN ${statusColumn} = '${CANCELLED_SHOWTIME_STATUS}' OR ${endTimeColumn} < NOW() THEN '${ENDED_SHOWTIME_STATUS}' ELSE '${ACTIVE_SHOWTIME_STATUS}' END`;

const normalizeStoredShowtimeStatus = (status) =>
  status === CANCELLED_SHOWTIME_STATUS
    ? CANCELLED_SHOWTIME_STATUS
    : ACTIVE_SHOWTIME_STATUS;

const toDate = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMinutes = (value, minutes) => {
  const date = toDate(value);
  if (!date) return null;
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date;
};

export const ShowtimeModel = {
  /**
   * Lấy tất cả lịch chiếu, kết hợp thông tin phim, rạp và phòng chiếu.
   */
  async findAll() {
    const [showtimes] = await db.query(`
      SELECT 
        s.showtime_id,
        s.movie_id,
        s.room_id,
        r.cinema_id,
        s.start_time,
        s.end_time,
        COALESCE(s.price_standard, s.price) AS price_standard,
        COALESCE(s.price_vip, s.price) AS price_vip,
        COALESCE(s.price_couple, s.price) AS price_couple,
        COALESCE(s.price_standard, s.price) AS price,
        s.available_seats,
        ${buildComputedStatusSql()} AS status,
        s.status AS raw_status,
        m.title AS movie_title,
        m.duration,
        c.cinema_name,
        r.room_name,
        r.room_type,
        r.total_seat
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      ORDER BY s.start_time DESC
    `);
    return showtimes;
  },

  /**
   * Lấy thông tin chi tiết của một lịch chiếu.
   */
  async findById(id) {
    const [rows] = await db.query(
      `
      SELECT 
        s.*,
        ${buildComputedStatusSql()} AS computed_status,
        COALESCE(s.price_standard, s.price) AS normalized_price_standard,
        COALESCE(s.price_vip, s.price) AS normalized_price_vip,
        COALESCE(s.price_couple, s.price) AS normalized_price_couple,
        m.title AS movie_title,
        m.duration,
        c.cinema_name,
        r.cinema_id,
        r.room_name,
        r.room_type,
        r.total_seat
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      WHERE s.showtime_id = ?
    `,
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Tạo một lịch chiếu mới.
   */
  async create(showtimeData) {
    const {
      movie_id,
      room_id,
      start_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status = ACTIVE_SHOWTIME_STATUS,
    } = showtimeData;
    const normalizedStatus = normalizeStoredShowtimeStatus(status);
    const movie = await this.getMovieById(movie_id);
    const room = await this.getRoomById(room_id);
    const normalizedStartTime = toDate(start_time);
    if (!normalizedStartTime) {
      throw buildAppError("Thời gian bắt đầu không hợp lệ.");
    }
    this.ensureStartTimeOnOrAfterReleaseDate(movie, normalizedStartTime);
    const calculatedEndTime = addMinutes(normalizedStartTime, movie.duration);
    await this.ensureRoomScheduleGap({
      roomId: room_id,
      startTime: normalizedStartTime,
      endTime: calculatedEndTime,
    });
    const standardPrice = price_standard ?? price ?? 0;
    const vipPrice = price_vip ?? standardPrice;
    const couplePrice = price_couple ?? standardPrice;
    const [result] = await db.query(
      "INSERT INTO Showtimes (movie_id, room_id, start_time, end_time, price, price_standard, price_vip, price_couple, available_seats, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        movie_id,
        room_id,
        normalizedStartTime,
        calculatedEndTime,
        standardPrice,
        standardPrice,
        vipPrice,
        couplePrice,
        available_seats ?? room.total_seat ?? 0,
        normalizedStatus,
      ],
    );
    return result.insertId;
  },

  /**
   * Cập nhật một lịch chiếu.
   */
  async update(id, showtimeData) {
    const {
      movie_id,
      room_id,
      start_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status,
    } = showtimeData;
    const normalizedStatus = normalizeStoredShowtimeStatus(status);
    const movie = await this.getMovieById(movie_id);
    const room = await this.getRoomById(room_id);
    const normalizedStartTime = toDate(start_time);
    if (!normalizedStartTime) {
      throw buildAppError("Thời gian bắt đầu không hợp lệ.");
    }
    this.ensureStartTimeOnOrAfterReleaseDate(movie, normalizedStartTime);
    const calculatedEndTime = addMinutes(normalizedStartTime, movie.duration);
    await this.ensureRoomScheduleGap({
      roomId: room_id,
      startTime: normalizedStartTime,
      endTime: calculatedEndTime,
      excludeShowtimeId: id,
    });
    const standardPrice = price_standard ?? price ?? 0;
    const vipPrice = price_vip ?? standardPrice;
    const couplePrice = price_couple ?? standardPrice;
    const [result] = await db.query(
      "UPDATE Showtimes SET movie_id = ?, room_id = ?, start_time = ?, end_time = ?, price = ?, price_standard = ?, price_vip = ?, price_couple = ?, available_seats = ?, status = ? WHERE showtime_id = ?",
      [
        movie_id,
        room_id,
        normalizedStartTime,
        calculatedEndTime,
        standardPrice,
        standardPrice,
        vipPrice,
        couplePrice,
        available_seats ?? room.total_seat ?? 0,
        normalizedStatus,
        id,
      ],
    );
    return result.affectedRows > 0;
  },

  /**
   * Xóa một lịch chiếu.
   */
  async delete(id) {
    // Cảnh báo: Chỉ nên xóa lịch chiếu chưa có ai đặt vé.
    const [result] = await db.query(
      "DELETE FROM Showtimes WHERE showtime_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Hủy một lịch chiếu (cập nhật trạng thái).
   */
  async cancel(id) {
    const [result] = await db.query(
      "UPDATE Showtimes SET status = 'cancelled' WHERE showtime_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Lấy danh sách các rạp chiếu phim.
   */
  async getCinemas() {
    const [cinemas] = await db.query(
      "SELECT cinemas_id AS cinema_id, cinema_name FROM Cinemas ORDER BY cinema_name ASC",
    );
    return cinemas;
  },

  /**
   * Lấy danh sách phòng chiếu thuộc một rạp cụ thể.
   */
  async getRoomsByCinema(cinemaId) {
    const sql = cinemaId
      ? "SELECT room_id, cinema_id, room_name, room_type, total_seat, status FROM Rooms WHERE cinema_id = ? AND status = 'active' ORDER BY room_name ASC"
      : "SELECT room_id, cinema_id, room_name, room_type, total_seat, status FROM Rooms WHERE status = 'active' ORDER BY room_name ASC";
    const [rooms] = await db.query(sql, cinemaId ? [cinemaId] : []);
    return rooms;
  },

  async getMovieById(movieId) {
    const [[movie]] = await db.query(
      "SELECT movie_id, title, duration, DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date_only FROM Movies WHERE movie_id = ?",
      [movieId],
    );
    if (!movie) {
      throw buildAppError("Không tìm thấy phim để tạo lịch chiếu.", 404);
    }
    const duration = Number(movie.duration || 0);
    if (duration <= 0) {
      throw buildAppError(
        `Phim "${movie.title}" chưa có thời lượng hợp lệ để xếp lịch chiếu.`,
      );
    }
    return {
      ...movie,
      duration,
    };
  },

  ensureStartTimeOnOrAfterReleaseDate(movie, startTime) {
    const releaseDate = String(movie?.release_date_only || "");
    const startDate = toDateKey(startTime);
    if (!releaseDate || !startDate) return;
    if (startDate < releaseDate) {
      throw buildAppError(
        `Phim "${movie.title}" chỉ được xếp lịch chiếu từ ngày phát hành ${releaseDate} trở đi.`,
      );
    }
  },

  async getRoomById(roomId) {
    const [[room]] = await db.query(
      "SELECT room_id, room_name, total_seat FROM Rooms WHERE room_id = ?",
      [roomId],
    );
    if (!room) {
      throw buildAppError("Không tìm thấy phòng chiếu.", 404);
    }
    return room;
  },

  async ensureRoomScheduleGap({
    roomId,
    startTime,
    endTime,
    excludeShowtimeId = null,
  }) {
    const normalizedStartTime = toDate(startTime);
    const normalizedEndTime = toDate(endTime);
    if (!normalizedStartTime || !normalizedEndTime) {
      throw buildAppError("Không thể tính thời gian chiếu hợp lệ.");
    }

    const endTimeWithCleanup = addMinutes(
      normalizedEndTime,
      CLEANUP_BUFFER_MINUTES,
    );
    const params = [
      roomId,
      endTimeWithCleanup,
      normalizedStartTime,
    ];
    let excludeClause = "";

    if (excludeShowtimeId) {
      excludeClause = "AND s.showtime_id <> ?";
      params.push(excludeShowtimeId);
    }

    const [conflicts] = await db.query(
      `
      SELECT
        s.showtime_id,
        s.start_time,
        s.end_time,
        m.title AS movie_title
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      WHERE s.room_id = ?
        AND s.status <> 'cancelled'
        AND s.start_time < ?
        AND DATE_ADD(s.end_time, INTERVAL ${CLEANUP_BUFFER_MINUTES} MINUTE) > ?
        ${excludeClause}
      ORDER BY s.start_time ASC
      `,
      params,
    );

    if (conflicts.length === 0) return;

    const conflictText = conflicts
      .map((showtime) => {
        const startLabel = toDate(showtime.start_time)?.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const endLabel = toDate(showtime.end_time)?.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return `${showtime.movie_title} (${startLabel} - ${endLabel})`;
      })
      .join(", ");

    throw buildAppError(
      `Phòng này đã có suất chiếu quá gần nhau. Mỗi suất trong cùng phòng phải cách nhau ít nhất ${CLEANUP_BUFFER_MINUTES} phút sau khi phim trước kết thúc. Xung đột với: ${conflictText}.`,
    );
  },
};
