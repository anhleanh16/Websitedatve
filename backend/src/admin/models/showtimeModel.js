import { db } from "../../../config/db.js";

const CLEANUP_BUFFER_MINUTES = 20;
const ACTIVE_SHOWTIME_STATUS = "active";
const ENDED_SHOWTIME_STATUS = "ended";
const CANCELLED_SHOWTIME_STATUS = "cancelled";

let schemaCapabilitiesPromise = null;

const getSchemaCapabilities = async () => {
  if (schemaCapabilitiesPromise) return schemaCapabilitiesPromise;

  schemaCapabilitiesPromise = (async () => {
    const [showtimeCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Showtimes'",
    );
    const [roomCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Rooms'",
    );

    const showtimeSet = new Set(showtimeCols.map((c) => c.COLUMN_NAME));
    const roomSet = new Set(roomCols.map((c) => c.COLUMN_NAME));

    return {
      showtimes: {
        hasPriceStandard: showtimeSet.has("price_standard"),
        hasPriceVip: showtimeSet.has("price_vip"),
        hasPriceCouple: showtimeSet.has("price_couple"),
      },
      rooms: {
        hasStatus: roomSet.has("status"),
      },
    };
  })();

  return schemaCapabilitiesPromise;
};

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
   * Hỗ trợ filter theo cinemaId và date (YYYY-MM-DD).
   */
  async findAll(filters = {}) {
    const caps = await getSchemaCapabilities();
    const priceStandardExpr = caps.showtimes.hasPriceStandard
      ? "COALESCE(s.price_standard, s.price)"
      : "s.price";
    const priceVipExpr = caps.showtimes.hasPriceVip
      ? "COALESCE(s.price_vip, s.price)"
      : priceStandardExpr;
    const priceCoupleExpr = caps.showtimes.hasPriceCouple
      ? "COALESCE(s.price_couple, s.price)"
      : priceStandardExpr;

    const whereClauses = [];
    const params = [];

    if (filters.cinemaId) {
      whereClauses.push("r.cinema_id = ?");
      params.push(filters.cinemaId);
    }

    if (filters.date) {
      whereClauses.push("DATE(CONVERT_TZ(s.start_time, '+00:00', '+07:00')) = ?");
      params.push(filters.date);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [showtimes] = await db.query(`
      SELECT 
        s.showtime_id,
        s.movie_id,
        s.room_id,
        r.cinema_id,
        s.start_time,
        s.end_time,
        ${priceStandardExpr} AS price_standard,
        ${priceVipExpr} AS price_vip,
        ${priceCoupleExpr} AS price_couple,
        ${priceStandardExpr} AS price,
        s.available_seats,
        ${buildComputedStatusSql()} AS status,
        s.status AS raw_status,
        m.title AS movie_title,
        m.duration,
        c.cinema_name,
        c.cinemas_id AS cinema_id_check,
        r.room_name,
        r.room_type,
        r.total_seat
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      ${whereSQL}
      ORDER BY s.start_time ASC
    `, params);
    return showtimes;
  },

  /**
   * Lấy thông tin chi tiết của một lịch chiếu.
   */
  async findById(id) {
    const caps = await getSchemaCapabilities();
    const priceStandardExpr = caps.showtimes.hasPriceStandard
      ? "COALESCE(s.price_standard, s.price)"
      : "s.price";
    const priceVipExpr = caps.showtimes.hasPriceVip
      ? "COALESCE(s.price_vip, s.price)"
      : priceStandardExpr;
    const priceCoupleExpr = caps.showtimes.hasPriceCouple
      ? "COALESCE(s.price_couple, s.price)"
      : priceStandardExpr;

    const [rows] = await db.query(
      `
      SELECT 
        s.*,
        ${buildComputedStatusSql()} AS computed_status,
        ${priceStandardExpr} AS normalized_price_standard,
        ${priceVipExpr} AS normalized_price_vip,
        ${priceCoupleExpr} AS normalized_price_couple,
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
    const caps = await getSchemaCapabilities();
    let {
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

    movie_id = Number(movie_id);
    room_id = Number(room_id);
    if (!movie_id || !room_id) {
      throw buildAppError("Thông tin phim hoặc phòng chiếu không hợp lệ.");
    }

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

    const standardPrice = Number(price_standard ?? price ?? 0) || 0;
    const vipPrice = Number(price_vip ?? standardPrice) || standardPrice;
    const couplePrice = Number(price_couple ?? standardPrice) || standardPrice;
    const seats = Number(available_seats ?? room.total_seat ?? 0);
    const normalizedSeats = Number.isNaN(seats) ? 0 : seats;

    const columns = [
      "movie_id",
      "room_id",
      "start_time",
      "end_time",
      "price",
      "available_seats",
      "status",
    ];
    const params = [
      movie_id,
      room_id,
      normalizedStartTime,
      calculatedEndTime,
      standardPrice,
      normalizedSeats,
      normalizedStatus,
    ];

    if (caps.showtimes.hasPriceStandard) {
      columns.splice(5, 0, "price_standard");
      params.splice(5, 0, standardPrice);
    }
    if (caps.showtimes.hasPriceVip) {
      const insertIndex = columns.indexOf("price") + 1;
      columns.splice(insertIndex, 0, "price_vip");
      params.splice(insertIndex, 0, vipPrice);
    }
    if (caps.showtimes.hasPriceCouple) {
      const insertIndex = columns.indexOf("price") + 1;
      columns.splice(insertIndex, 0, "price_couple");
      params.splice(insertIndex, 0, couplePrice);
    }

    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await db.query(
      `INSERT INTO Showtimes (${columns.join(", ")}) VALUES (${placeholders})`,
      params,
    );
    return result.insertId;
  },

  /**
   * Tạo lịch chiếu lặp lại theo khung giờ cố định trong một khoảng ngày.
   * Bỏ qua (không lỗi) những ngày bị xung đột lịch phòng.
   * @returns {{ created: number[], skipped: Array<{date:string, reason:string}> }}
   */
  async createRecurring(data) {
    const caps = await getSchemaCapabilities();
    const {
      movie_id,
      room_id,
      time_slots,   // [{ hour: 10, minute: 30 }, ...]
      start_date,   // "YYYY-MM-DD"
      end_date,     // "YYYY-MM-DD"
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
    } = data;

    const movie = await this.getMovieById(movie_id);
    const room  = await this.getRoomById(room_id);

    const standardPrice = Number(price_standard ?? price ?? 0) || 0;
    const vipPrice      = Number(price_vip ?? standardPrice) || standardPrice;
    const couplePrice   = Number(price_couple ?? standardPrice) || standardPrice;
    const seats         = Number(available_seats ?? room.total_seat ?? 0);
    const normalizedSeats = Number.isNaN(seats) ? 0 : seats;

    // parse start/end date
    const startD = new Date(`${start_date}T00:00:00`);
    const endD   = new Date(`${end_date}T23:59:59`);
    if (isNaN(startD.getTime()) || isNaN(endD.getTime()) || startD > endD) {
      throw buildAppError("Khoảng ngày không hợp lệ.");
    }
    if (!Array.isArray(time_slots) || time_slots.length === 0) {
      throw buildAppError("Cần ít nhất một khung giờ.");
    }

    const created = [];
    const skipped = [];

    // iterate each day in range
    const cur = new Date(startD);
    while (cur <= endD) {
      const dateKey = toDateKey(cur);
      const todayCreatedSlots = []; // Lưu các slot vừa tạo trong hôm nay để kiểm tra xung đột lẫn nhau

      for (const slot of time_slots) {
        const hour   = Number(slot.hour   ?? 0);
        const minute = Number(slot.minute ?? 0);

        const startTime = new Date(cur);
        startTime.setHours(hour, minute, 0, 0);
        const endTime = addMinutes(startTime, movie.duration);
        const endTimeWithCleanup = addMinutes(endTime, CLEANUP_BUFFER_MINUTES);

        // bỏ qua nếu trước ngày phát hành
        try {
          this.ensureStartTimeOnOrAfterReleaseDate(movie, startTime);
        } catch {
          skipped.push({ date: dateKey, hour, minute, reason: "Trước ngày phát hành phim." });
          continue;
        }

        // Kiểm tra xung đột với các slot vừa tạo trong cùng hôm nay
        let conflictWithTodaySlot = null;
        for (const existingSlot of todayCreatedSlots) {
          const existingEndWithCleanup = addMinutes(existingSlot.endTime, CLEANUP_BUFFER_MINUTES);
          if (startTime < existingEndWithCleanup && endTimeWithCleanup > existingSlot.startTime) {
            conflictWithTodaySlot = existingSlot;
            break;
          }
        }
        if (conflictWithTodaySlot) {
          skipped.push({ 
            date: dateKey, 
            hour, 
            minute, 
            reason: `Trùng khung giờ với suất vừa tạo (${String(conflictWithTodaySlot.hour).padStart(2, '0')}:${String(conflictWithTodaySlot.minute).padStart(2, '0')})` 
          });
          continue;
        }

        // bỏ qua nếu xung đột lịch phòng trong DB
        try {
          await this.ensureRoomScheduleGap({ roomId: room_id, startTime, endTime });
        } catch (err) {
          skipped.push({ date: dateKey, hour, minute, reason: err.message });
          continue;
        }

        const columns = [
          "movie_id",
          "room_id",
          "start_time",
          "end_time",
          "price",
          "available_seats",
          "status",
        ];
        const params = [
          movie_id,
          room_id,
          startTime,
          endTime,
          standardPrice,
          normalizedSeats,
          ACTIVE_SHOWTIME_STATUS,
        ];

        if (caps.showtimes.hasPriceStandard) {
          columns.splice(5, 0, "price_standard");
          params.splice(5, 0, standardPrice);
        }
        if (caps.showtimes.hasPriceVip) {
          const insertIndex = columns.indexOf("price") + 1;
          columns.splice(insertIndex, 0, "price_vip");
          params.splice(insertIndex, 0, vipPrice);
        }
        if (caps.showtimes.hasPriceCouple) {
          const insertIndex = columns.indexOf("price") + 1;
          columns.splice(insertIndex, 0, "price_couple");
          params.splice(insertIndex, 0, couplePrice);
        }

        const placeholders = columns.map(() => "?").join(", ");
        const [result] = await db.query(
          `INSERT INTO Showtimes (${columns.join(", ")}) VALUES (${placeholders})`,
          params,
        );
        created.push(result.insertId);
        todayCreatedSlots.push({ startTime, endTime, hour, minute });
      }

      cur.setDate(cur.getDate() + 1);
    }

    return { created, skipped };
  },

  /**
   * Cập nhật một lịch chiếu.
   */
  async update(id, showtimeData) {
    const caps = await getSchemaCapabilities();
    let {
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

    movie_id = Number(movie_id);
    room_id = Number(room_id);
    if (!movie_id || !room_id) {
      throw buildAppError("Thông tin phim hoặc phòng chiếu không hợp lệ.");
    }

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
    const standardPrice = Number(price_standard ?? price ?? 0) || 0;
    const vipPrice = Number(price_vip ?? standardPrice) || standardPrice;
    const couplePrice = Number(price_couple ?? standardPrice) || standardPrice;
    const seats = Number(available_seats ?? room.total_seat ?? 0);
    const normalizedSeats = Number.isNaN(seats) ? 0 : seats;
    const setClauses = [
      "movie_id = ?",
      "room_id = ?",
      "start_time = ?",
      "end_time = ?",
      "price = ?",
      "available_seats = ?",
      "status = ?",
    ];
    const params = [
      movie_id,
      room_id,
      normalizedStartTime,
      calculatedEndTime,
      standardPrice,
      normalizedSeats,
      normalizedStatus,
    ];

    if (caps.showtimes.hasPriceStandard) {
      setClauses.splice(5, 0, "price_standard = ?");
      params.splice(5, 0, standardPrice);
    }
    if (caps.showtimes.hasPriceVip) {
      const insertIndex = setClauses.indexOf("price = ?") + 1;
      setClauses.splice(insertIndex, 0, "price_vip = ?");
      params.splice(insertIndex, 0, vipPrice);
    }
    if (caps.showtimes.hasPriceCouple) {
      const insertIndex = setClauses.indexOf("price = ?") + 1;
      setClauses.splice(insertIndex, 0, "price_couple = ?");
      params.splice(insertIndex, 0, couplePrice);
    }

    params.push(id);
    const [result] = await db.query(
      `UPDATE Showtimes SET ${setClauses.join(", ")} WHERE showtime_id = ?`,
      params,
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
    const caps = await getSchemaCapabilities();
    const selectColumns = caps.rooms.hasStatus
      ? "room_id, cinema_id, room_name, room_type, total_seat, status"
      : "room_id, cinema_id, room_name, room_type, total_seat";
    const whereStatus = caps.rooms.hasStatus ? " AND status = 'active'" : "";

    const sql = cinemaId
      ? `SELECT ${selectColumns} FROM Rooms WHERE cinema_id = ?${whereStatus} ORDER BY room_name ASC`
      : `SELECT ${selectColumns} FROM Rooms WHERE 1=1${whereStatus} ORDER BY room_name ASC`;
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
      `Không thể tạo suất chiếu này! Phòng đã có lịch trùng khung giờ hoặc chưa đủ thời gian dọn dẹp (${CLEANUP_BUFFER_MINUTES} phút). Xung đột với: ${conflictText}.`,
    );
  },
};
