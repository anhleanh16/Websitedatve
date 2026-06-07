import { db } from '../../../config/db.js';

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const adminDashboard = async (req, res) => {
  try {
    const [[{ totalUsers }]]    = await db.query('SELECT COUNT(*) AS totalUsers FROM User');
    const [[{ totalMovies }]]   = await db.query('SELECT COUNT(*) AS totalMovies FROM Movies');
    const [[{ totalBookings }]] = await db.query('SELECT COUNT(*) AS totalBookings FROM Orders');
    const [[{ totalRevenue }]]  = await db.query(
      "SELECT IFNULL(SUM(total_amount),0) AS totalRevenue FROM Orders WHERE payment_status='paid'"
    );
    res.json({ totalUsers, totalMovies, totalBookings, totalRevenue, recentActivity: [] });
  } catch {
    res.json({ totalUsers: 0, totalBookings: 0, totalRevenue: 0, totalMovies: 0, recentActivity: [] });
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAdminUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, full_name, email, phone, status, role_id, created_at FROM User ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch {
    res.json({ users: [] });
  }
};

export const deactivateAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query("UPDATE User SET status='inactive' WHERE id=?", [userId]);
    res.json({ message: 'User deactivated' });
  } catch {
    res.status(500).json({ message: 'Error deactivating user' });
  }
};

// ─── Movies ───────────────────────────────────────────────────────────────────
export const getAdminMovies = async (req, res) => {
  try {
    const [movies] = await db.query('SELECT * FROM Movies ORDER BY release_date DESC');
    res.json({ movies });
  } catch {
    res.json({ movies: [] });
  }
};

export const createMovie = async (req, res) => {
  try {
    const { title, description, duration, age_limit, director, actors, trailer_url, poster, release_date, status, language, country } = req.body;
    const [result] = await db.query(
      'INSERT INTO Movies (title,description,duration,age_limit,director,actors,trailer_url,poster,release_date,status,language,country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [title, description, duration, age_limit, director, actors, trailer_url, poster, release_date, status, language, country]
    );
    res.status(201).json({ message: 'Movie created', movieId: result.insertId });
  } catch {
    res.status(500).json({ message: 'Error creating movie' });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).map(k => `${k}=?`).join(',');
    await db.query(`UPDATE Movies SET ${keys} WHERE movie_id=?`, [...Object.values(fields), id]);
    res.json({ message: 'Movie updated' });
  } catch {
    res.status(500).json({ message: 'Error updating movie' });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM Movies WHERE movie_id=?', [id]);
    res.json({ message: 'Movie deleted' });
  } catch {
    res.status(500).json({ message: 'Error deleting movie' });
  }
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/bookings
 * Danh sách vé với thông tin join đầy đủ
 */
export const getAdminBookings = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      where += ' AND o.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (o.booking_code LIKE ? OR u.full_name LIKE ? OR m.title LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    const [rows] = await db.query(
      `SELECT
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.order_date,
        o.status,
        o.created_at,
        u.full_name AS user_name,
        u.email     AS user_email,
        u.phone     AS user_phone,
        m.title     AS movie_title,
        c.cinema_name,
        r.room_name,
        r.room_type,
        s.start_time,
        s.end_time,
        GROUP_CONCAT(DISTINCT se.seat_code ORDER BY se.seat_code SEPARATOR ', ') AS seats,
        MIN(t.ticket_id) AS ticket_id,
        MIN(t.qr_code)   AS qr_code,
        MIN(t.ticket_status) AS ticket_status,
        MIN(t.check_in_time) AS check_in_time
      FROM Orders o
      JOIN User u        ON u.id          = o.user_id
      JOIN Tickets t     ON t.order_id    = o.order_id
      JOIN Showtimes s   ON s.showtime_id = t.showtime_id
      JOIN Movies m      ON m.movie_id    = s.movie_id
      JOIN Rooms r       ON r.room_id     = s.room_id
      JOIN Cinemas c     ON c.cinemas_id  = r.cinema_id
      JOIN Seats se      ON se.seat_id    = t.seat_id
      ${where}
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT o.order_id) AS total
       FROM Orders o
       JOIN User u      ON u.id          = o.user_id
       JOIN Tickets t   ON t.order_id    = o.order_id
       JOIN Showtimes s ON s.showtime_id = t.showtime_id
       JOIN Movies m    ON m.movie_id    = s.movie_id
       ${where}`,
      params
    );

    res.json({ bookings: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('getAdminBookings error:', err);
    res.json({ bookings: [], total: 0 });
  }
};

/**
 * GET /api/admin/bookings/:orderId
 * Chi tiết vé
 */
export const getAdminBookingDetail = async (req, res) => {
  try {
    const { orderId } = req.params;

    const [orders] = await db.query(
      `SELECT
        o.*,
        u.full_name AS user_name, u.email AS user_email, u.phone AS user_phone,
        m.title AS movie_title,
        c.cinema_name,
        r.room_name, r.room_type,
        s.start_time, s.end_time
      FROM Orders o
      JOIN User u        ON u.id          = o.user_id
      JOIN Tickets t     ON t.order_id    = o.order_id
      JOIN Showtimes s   ON s.showtime_id = t.showtime_id
      JOIN Movies m      ON m.movie_id    = s.movie_id
      JOIN Rooms r       ON r.room_id     = s.room_id
      JOIN Cinemas c     ON c.cinemas_id  = r.cinema_id
      WHERE o.order_id = ?
      LIMIT 1`,
      [orderId]
    );

    if (!orders.length) return res.status(404).json({ message: 'Booking not found' });

    const [tickets] = await db.query(
      `SELECT t.*, se.seat_code, se.seat_type
       FROM Tickets t
       JOIN Seats se ON se.seat_id = t.seat_id
       WHERE t.order_id = ?`,
      [orderId]
    );

    const [combos] = await db.query(
      `SELECT oc.quantity, cb.combo_name, cb.price
       FROM Order_Combos oc
       JOIN Combos cb ON cb.combo_id = oc.combo_id
       WHERE oc.order_id = ?`,
      [orderId]
    );

    res.json({ booking: orders[0], tickets, combos });
  } catch (err) {
    console.error('getAdminBookingDetail error:', err);
    res.status(500).json({ message: 'Error fetching booking detail' });
  }
};

/**
 * PUT /api/admin/bookings/:orderId/refund
 * Hoàn vé
 */
export const refundBooking = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { orderId } = req.params;
    const { reason, refundMethod } = req.body;

    // Kiểm tra đơn tồn tại
    const [[order]] = await conn.query(
      "SELECT * FROM Orders WHERE order_id = ? AND status IN ('pending','confirmed')",
      [orderId]
    );
    if (!order) {
      await conn.rollback();
      return res.status(400).json({ message: 'Booking not found or cannot be refunded' });
    }

    // Cập nhật trạng thái đơn
    await conn.query(
      "UPDATE Orders SET status='cancelled', payment_status='paid' WHERE order_id=?",
      [orderId]
    );

    // Cập nhật trạng thái vé
    await conn.query(
      "UPDATE Tickets SET ticket_status='cancelled' WHERE order_id=?",
      [orderId]
    );

    // Ghi nhận hoàn tiền vào lịch sử điểm nếu là cộng điểm
    if (refundMethod === 'points') {
      const points = Math.floor(order.total_amount / 10000);
      await conn.query(
        "UPDATE User SET point = point + ? WHERE id = ?",
        [points, order.user_id]
      );
      await conn.query(
        "INSERT INTO Point_History (user_id, points_change, description) VALUES (?,?,?)",
        [order.user_id, points, `Hoàn điểm đơn ${order.booking_code} - ${reason}`]
      );
    }

    await conn.commit();
    res.json({ message: 'Booking refunded successfully', orderId, reason, refundMethod });
  } catch (err) {
    await conn.rollback();
    console.error('refundBooking error:', err);
    res.status(500).json({ message: 'Error refunding booking' });
  } finally {
    conn.release();
  }
};

/**
 * PUT /api/admin/bookings/:orderId/check-in
 * Kiểm tra và check-in vé
 */
export const checkInBooking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { code } = req.body; // booking_code hoặc qr_code

    // Lấy thông tin đơn
    const [[order]] = await db.query(
      "SELECT * FROM Orders WHERE order_id = ? AND status = 'confirmed'",
      [orderId]
    );
    if (!order) {
      return res.status(404).json({ valid: false, message: 'Booking not found or not confirmed' });
    }

    // Xác minh mã
    const isValid = code && (
      order.booking_code.toUpperCase() === code.trim().toUpperCase()
    );

    if (!isValid) {
      return res.status(400).json({ valid: false, message: 'Invalid booking code' });
    }

    // Kiểm tra vé đã dùng chưa
    const [[ticket]] = await db.query(
      "SELECT * FROM Tickets WHERE order_id = ? AND ticket_status = 'used' LIMIT 1",
      [orderId]
    );
    if (ticket) {
      return res.json({ valid: true, alreadyUsed: true, checkInTime: ticket.check_in_time });
    }

    // Thực hiện check-in
    const now = new Date();
    await db.query(
      "UPDATE Tickets SET ticket_status='used', check_in_time=? WHERE order_id=?",
      [now, orderId]
    );
    await db.query(
      "UPDATE Orders SET status='completed' WHERE order_id=?",
      [orderId]
    );

    res.json({ valid: true, alreadyUsed: false, checkInTime: now, message: 'Check-in successful' });
  } catch (err) {
    console.error('checkInBooking error:', err);
    res.status(500).json({ message: 'Error during check-in' });
  }
};

/**
 * GET /api/admin/bookings/verify/:code
 * Xác minh mã vé (dùng khi quét QR)
 */
export const verifyBookingCode = async (req, res) => {
  try {
    const { code } = req.params;

    const [[order]] = await db.query(
      `SELECT o.*, u.full_name AS user_name, u.phone AS user_phone,
              m.title AS movie_title, s.start_time, c.cinema_name,
              GROUP_CONCAT(se.seat_code SEPARATOR ', ') AS seats,
              MIN(t.ticket_status) AS ticket_status,
              MIN(t.check_in_time) AS check_in_time
       FROM Orders o
       JOIN User u      ON u.id          = o.user_id
       JOIN Tickets t   ON t.order_id    = o.order_id
       JOIN Showtimes s ON s.showtime_id = t.showtime_id
       JOIN Movies m    ON m.movie_id    = s.movie_id
       JOIN Rooms r     ON r.room_id     = s.room_id
       JOIN Cinemas c   ON c.cinemas_id  = r.cinema_id
       JOIN Seats se    ON se.seat_id    = t.seat_id
       WHERE o.booking_code = ? OR t.qr_code = ?
       GROUP BY o.order_id
       LIMIT 1`,
      [code, code]
    );

    if (!order) return res.json({ valid: false, message: 'Booking code not found' });

    res.json({
      valid: true,
      alreadyUsed: order.ticket_status === 'used',
      booking: order,
    });
  } catch (err) {
    console.error('verifyBookingCode error:', err);
    res.status(500).json({ valid: false, message: 'Verification error' });
  }
};
