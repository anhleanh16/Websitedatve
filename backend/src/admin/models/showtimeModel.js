import { db } from "../../../config/db.js";

export const ShowtimeModel = {
  /**
   * Lấy tất cả lịch chiếu, kết hợp thông tin phim, rạp và phòng chiếu.
   */
  async findAll() {
    const [showtimes] = await db.query(`
      SELECT 
        s.showtime_id,
        s.start_time,
        s.end_time,
        s.status,
        m.title AS movie_title,
        c.cinema_name,
        cr.room_name,
        cr.room_type
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Cinema_Rooms cr ON s.room_id = cr.room_id
      JOIN Cinemas c ON cr.cinema_id = c.cinema_id
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
        m.title AS movie_title,
        c.cinema_name,
        cr.room_name
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Cinema_Rooms cr ON s.room_id = cr.room_id
      JOIN Cinemas c ON cr.cinema_id = c.cinema_id
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
      status = "scheduled",
    } = showtimeData;
    const [result] = await db.query(
      "INSERT INTO Showtimes (movie_id, room_id, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)",
      [movie_id, room_id, start_time, end_time, status],
    );
    return result.insertId;
  },

  /**
   * Cập nhật một lịch chiếu.
   */
  async update(id, showtimeData) {
    const { movie_id, room_id, start_time, end_time, status } = showtimeData;
    const [result] = await db.query(
      "UPDATE Showtimes SET movie_id = ?, room_id = ?, start_time = ?, end_time = ?, status = ? WHERE showtime_id = ?",
      [movie_id, room_id, start_time, end_time, status, id],
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
      "SELECT cinema_id, cinema_name FROM Cinemas",
    );
    return cinemas;
  },

  /**
   * Lấy danh sách phòng chiếu thuộc một rạp cụ thể.
   */
  async getRoomsByCinema(cinemaId) {
    const [rooms] = await db.query(
      "SELECT room_id, room_name FROM Cinema_Rooms WHERE cinema_id = ?",
      [cinemaId],
    );
    return rooms;
  },
};
