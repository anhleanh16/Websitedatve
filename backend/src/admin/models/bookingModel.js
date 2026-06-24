import { db } from "../../../config/db.js";

export const BookingModel = {
  /**
   * Lấy danh sách booking với các tùy chọn filter và search.
   */
  async findAll(filters = {}) {
    let query = `
      SELECT
        o.order_id AS booking_id,
        o.booking_code,
        o.total_amount AS total_price,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.full_name,
        u.email,
        MIN(m.title) AS movie_title,
        MIN(s.start_time) AS start_time
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
    `;

    const queryParams = [];
    const whereClauses = [];

    if (filters.status) {
      whereClauses.push("o.status = ?");
      queryParams.push(filters.status);
    }

    if (filters.search) {
      whereClauses.push(
        "(u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR o.booking_code LIKE ?)",
      );
      const searchTerm = `%${filters.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += `
      GROUP BY
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.full_name,
        u.email
      ORDER BY o.created_at DESC
    `;

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
        o.order_id AS booking_id,
        o.booking_code,
        o.total_amount AS total_price,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone AS phone_number,
        MIN(s.start_time) AS start_time,
        MIN(s.end_time) AS end_time,
        MIN(m.title) AS movie_title,
        MIN(m.poster) AS poster,
        MIN(c.cinema_name) AS cinema_name,
        MIN(r.room_name) AS room_name
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      LEFT JOIN Rooms r ON s.room_id = r.room_id
      LEFT JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      WHERE o.order_id = ?
      GROUP BY
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.id,
        u.full_name,
        u.email,
        u.phone
    `,
      [id],
    );

    if (!bookingDetails.length) return null;
    const booking = bookingDetails[0];

    const [seats] = await db.query(
      `
      SELECT s.seat_code
      FROM Tickets t
      JOIN Seats s ON s.seat_id = t.seat_id
      WHERE t.order_id = ?
      ORDER BY s.seat_code
    `,
      [id],
    );
    booking.seats = seats.map((s) => s.seat_code);

    const [combos] = await db.query(
      `
      SELECT c.combo_name, oc.quantity, c.price
      FROM Order_Combos oc
      JOIN Combos c ON c.combo_id = oc.combo_id
      WHERE oc.order_id = ?
    `,
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
        o.order_id AS booking_id,
        o.booking_code,
        o.status,
        u.full_name,
        MIN(m.title) AS movie_title,
        MIN(s.start_time) AS start_time
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      WHERE o.booking_code = ?
      GROUP BY o.order_id, o.booking_code, o.status, u.full_name
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
      "UPDATE Orders SET status = ? WHERE order_id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  },
};
