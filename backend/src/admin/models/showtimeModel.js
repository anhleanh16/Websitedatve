import { db } from "../../../config/db.js";

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
        s.status,
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
      end_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status = "active",
    } = showtimeData;
    const standardPrice = price_standard ?? price ?? 0;
    const vipPrice = price_vip ?? standardPrice;
    const couplePrice = price_couple ?? standardPrice;
    const [result] = await db.query(
      "INSERT INTO Showtimes (movie_id, room_id, start_time, end_time, price, price_standard, price_vip, price_couple, available_seats, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        movie_id,
        room_id,
        start_time,
        end_time,
        standardPrice,
        standardPrice,
        vipPrice,
        couplePrice,
        available_seats,
        status,
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
      end_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status,
    } = showtimeData;
    const standardPrice = price_standard ?? price ?? 0;
    const vipPrice = price_vip ?? standardPrice;
    const couplePrice = price_couple ?? standardPrice;
    const [result] = await db.query(
      "UPDATE Showtimes SET movie_id = ?, room_id = ?, start_time = ?, end_time = ?, price = ?, price_standard = ?, price_vip = ?, price_couple = ?, available_seats = ?, status = ? WHERE showtime_id = ?",
      [
        movie_id,
        room_id,
        start_time,
        end_time,
        standardPrice,
        standardPrice,
        vipPrice,
        couplePrice,
        available_seats,
        status,
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
};
