import { db } from "../../../config/db.js";

export const BookingModel = {
  /**
   * Lấy danh sách booking với các tùy chọn filter và search.
   */
  async findAll(filters = {}) {
    let query = `
      SELECT 
        b.booking_id, b.booking_code, b.total_price, b.status, b.created_at,
        u.full_name, u.email,
        m.title AS movie_title,
        s.start_time
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
    `;

    const queryParams = [];
    const whereClauses = [];

    if (filters.status) {
      whereClauses.push("b.status = ?");
      queryParams.push(filters.status);
    }

    if (filters.search) {
      whereClauses.push(
        "(u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR b.booking_code LIKE ?)",
      );
      const searchTerm = `%${filters.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += " ORDER BY b.created_at DESC";

    const [bookings] = await db.query(query, queryParams);
    return bookings;
  },

  /**
   * Lấy chi tiết một booking bằng ID.
   */
  async findById(id) {
    const [bookingDetails] = await db.query(
      `
      SELECT 
        b.*, 
        u.full_name, u.email, u.phone_number,
        s.start_time, s.end_time,
        m.title AS movie_title, m.poster,
        c.cinema_name,
        cr.room_name
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Cinema_Rooms cr ON s.room_id = cr.room_id
      JOIN Cinemas c ON cr.cinema_id = c.cinema_id
      WHERE b.booking_id = ?
    `,
      [id],
    );

    if (!bookingDetails.length) return null;
    const booking = bookingDetails[0];

    const [seats] = await db.query(
      "SELECT seat_number FROM Booking_Seats WHERE booking_id = ?",
      [id],
    );
    booking.seats = seats.map((s) => s.seat_number);

    const [combos] = await db.query(
      "SELECT combo_name, quantity, price FROM Booking_Combos WHERE booking_id = ?",
      [id],
    );
    booking.combos = combos;

    return booking;
  },

  /**
   * Tìm booking bằng mã code.
   */
  async findByCode(code) {
    const [bookingDetails] = await db.query(
      `
      SELECT 
        b.booking_id, b.booking_code, b.status,
        u.full_name,
        m.title AS movie_title,
        s.start_time
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
      WHERE b.booking_code = ?
    `,
      [code],
    );
    return bookingDetails[0] || null;
  },

  /**
   * Cập nhật trạng thái của một booking.
   */
  async updateStatus(id, status) {
    const [result] = await db.query(
      "UPDATE Bookings SET status = ? WHERE booking_id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  },
};
