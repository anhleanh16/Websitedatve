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
      `SELECT u.id,
              u.full_name,
              u.email,
              u.phone,
              u.birthday,
              u.sex,
              u.point,
              u.status,
              u.created_at,
              u.role_id,
              r.role_name AS role
       FROM User u
       LEFT JOIN Roles r ON r.role_id = u.role_id
       ORDER BY u.created_at DESC`
    );
    res.json({ users });
  } catch (err) {
    console.error('getAdminUsers error:', err);
    res.json({ users: [] });
  }
};

export const deactivateAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [[user]] = await db.query('SELECT id, role_id FROM User WHERE id = ? LIMIT 1', [userId]);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (Number(user.id) === 1 && Number(user.role_id) === 1) {
      return res.status(403).json({ message: 'Không thể thay đổi trạng thái tài khoản admin mặc định.' });
    }

    await db.query("UPDATE User SET status='inactive' WHERE id=?", [userId]);
    res.json({ message: 'User deactivated' });
  } catch (err) {
    console.error('deactivateAdminUser error:', err);
    res.status(500).json({ message: 'Error deactivating user' });
  }
};

// ─── Movies ───────────────────────────────────────────────────────────────────
export const getAdminMovies = async (req, res) => {
  try {
    const { trash = 'false' } = req.query;
    const isTrash = trash === 'true';
    
    const [movies] = await db.query(
      'SELECT * FROM Movies WHERE is_deleted = ? ORDER BY release_date DESC',
      [isTrash ? 1 : 0]
    );
    
    // Lấy danh mục cho từng phim
    const moviesWithCategories = await Promise.all(
      movies.map(async (movie) => {
        const [categories] = await db.query(`
          SELECT mc.category_id, mc.category_name
          FROM Movie_Categories mc
          JOIN Movie_Category_Detail mcd ON mc.category_id = mcd.category_id
          WHERE mcd.movie_id = ?
        `, [movie.movie_id]);
        
        return {
          ...movie,
          posters: movie.posters ? JSON.parse(movie.posters) : [],
          categories: categories
        };
      })
    );
    
    res.json({ movies: moviesWithCategories });
  } catch (err) {
    console.error(err);
    res.json({ movies: [] });
  }
};

export const createMovie = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const { title, description, duration, age_limit, director, actors, release_date, status, language, country, categories } = req.body;
    
    // Xử lý poster: file đầu tiên là poster chính, các file sau là poster phụ
    let poster = null;
    let posters = [];
    if (req.files && req.files.posters) {
      const posterFiles = Array.isArray(req.files.posters) ? req.files.posters : [req.files.posters];
      if (posterFiles.length > 0) {
        poster = `/uploads/movies/${posterFiles[0].filename}`;
        posters = posterFiles.slice(1).map(file => `/uploads/movies/${file.filename}`);
      }
    }

    // Xử lý trailer
    let trailer = null;
    if (req.files && req.files.trailer) {
      const trailerFiles = Array.isArray(req.files.trailer) ? req.files.trailer : [req.files.trailer];
      if (trailerFiles.length > 0) {
        trailer = `/uploads/trailers/${trailerFiles[0].filename}`;
      }
    }

    const [result] = await conn.query(
      'INSERT INTO Movies (title,description,duration,age_limit,director,actors,trailer,poster,posters,release_date,status,language,country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [title, description, duration, age_limit, director, actors, trailer, poster, JSON.stringify(posters), release_date, status, language, country]
    );
    const movieId = result.insertId;
    
    // Thêm danh mục cho phim
    if (categories && categories.length > 0) {
      const categoryIds = Array.isArray(categories) ? categories : [categories];
      for (const categoryId of categoryIds) {
        await conn.query(
          'INSERT INTO Movie_Category_Detail (movie_id, category_id) VALUES (?, ?)',
          [movieId, categoryId]
        );
      }
    }
    
    await conn.commit();
    res.status(201).json({ message: 'Movie created', movieId: movieId });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating movie:', err);
    res.status(500).json({ message: 'Error creating movie' });
  } finally {
    conn.release();
  }
};

export const updateMovie = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    
    const { id } = req.params;
    const { title, description, duration, age_limit, director, actors, release_date, status, language, country, existing_main_poster, existing_posters, categories } = req.body;
    
    // Lấy thông tin phim hiện tại
    const [existingMovie] = await conn.query('SELECT * FROM Movies WHERE movie_id = ?', [id]);
    if (!existingMovie.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Movie not found' });
    }
    const movie = existingMovie[0];
    
    // Xử lý poster
    let poster = existing_main_poster || movie.poster;
    let posters = existing_posters ? JSON.parse(existing_posters) : (movie.posters ? JSON.parse(movie.posters) : []);
    
    // Thêm các poster mới nếu có
    if (req.files && req.files.posters) {
      const posterFiles = Array.isArray(req.files.posters) ? req.files.posters : [req.files.posters];
      for (const file of posterFiles) {
        const filePath = `/uploads/movies/${file.filename}`;
        if (!poster) {
          poster = filePath;
        } else {
          posters.push(filePath);
        }
      }
    }
    
    // Xử lý trailer: nếu có trailer mới, thay thế hoàn toàn
    let trailer = movie.trailer;
    if (req.files && req.files.trailer) {
      const trailerFiles = Array.isArray(req.files.trailer) ? req.files.trailer : [req.files.trailer];
      if (trailerFiles.length > 0) {
        trailer = `/uploads/trailers/${trailerFiles[0].filename}`;
      }
    }

    await conn.query(
      'UPDATE Movies SET title=?, description=?, duration=?, age_limit=?, director=?, actors=?, trailer=?, poster=?, posters=?, release_date=?, status=?, language=?, country=? WHERE movie_id=?',
      [title, description, duration, age_limit, director, actors, trailer, poster, JSON.stringify(posters), release_date, status, language, country, id]
    );
    
    // Cập nhật danh mục cho phim: xóa cũ, thêm mới
    await conn.query('DELETE FROM Movie_Category_Detail WHERE movie_id = ?', [id]);
    if (categories && categories.length > 0) {
      const categoryIds = Array.isArray(categories) ? categories : [categories];
      for (const categoryId of categoryIds) {
        await conn.query(
          'INSERT INTO Movie_Category_Detail (movie_id, category_id) VALUES (?, ?)',
          [id, categoryId]
        );
      }
    }
    
    await conn.commit();
    res.json({ message: 'Movie updated' });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating movie:', err);
    res.status(500).json({ message: 'Error updating movie' });
  } finally {
    conn.release();
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE Movies SET is_deleted = 1 WHERE movie_id=?', [id]);
    res.json({ message: 'Movie moved to trash' });
  } catch {
    res.status(500).json({ message: 'Error deleting movie' });
  }
};

export const restoreMovie = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE Movies SET is_deleted = 0 WHERE movie_id=?', [id]);
    res.json({ message: 'Movie restored' });
  } catch {
    res.status(500).json({ message: 'Error restoring movie' });
  }
};

export const permanentDeleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM Movies WHERE movie_id=?', [id]);
    res.json({ message: 'Movie permanently deleted' });
  } catch {
    res.status(500).json({ message: 'Error permanently deleting movie' });
  }
};

export const toggleHideMovie = async (req, res) => {
  try {
    const { id } = req.params;
    const [[movie]] = await db.query('SELECT is_hidden FROM Movies WHERE movie_id=?', [id]);
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    await db.query('UPDATE Movies SET is_hidden = ? WHERE movie_id=?', [!movie.is_hidden ? 1 : 0, [id]]);
    res.json({ message: 'Movie visibility updated', is_hidden: !movie.is_hidden ? 1 : 0 });
  } catch {
    res.status(500).json({ message: 'Error updating movie visibility' });
  }
};

// ─── Movie Categories ───────────────────────────────────────────────────────────
export const getAdminCategories = async (req, res) => {
  try {
    // Get categories with movie count
    const [categories] = await db.query(`
      SELECT 
        mc.*, 
        COUNT(mcd.movie_id) as movieCount 
      FROM Movie_Categories mc 
      LEFT JOIN Movie_Category_Detail mcd ON mc.category_id = mcd.category_id 
      GROUP BY mc.category_id 
      ORDER BY mc.category_name
    `);
    res.json({ categories });
  } catch (err) {
    console.error('getAdminCategories error:', err);
    res.json({ categories: [] });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    const [result] = await db.query(
      'INSERT INTO Movie_Categories (category_name) VALUES (?)',
      [category_name]
    );
    res.status(201).json({ message: 'Category created', categoryId: result.insertId });
  } catch {
    res.status(500).json({ message: 'Error creating category' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name } = req.body;
    await db.query(
      'UPDATE Movie_Categories SET category_name=? WHERE category_id=?',
      [category_name, id]
    );
    res.json({ message: 'Category updated' });
  } catch {
    res.status(500).json({ message: 'Error updating category' });
  }
};

export const deleteCategory = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    
    // Kiểm tra xem còn phim thuộc danh mục này không
    const [[{ movieCount }]] = await conn.query(
      'SELECT COUNT(*) AS movieCount FROM Movie_Category_Detail WHERE category_id = ?',
      [id]
    );
    
    if (movieCount > 0) {
      await conn.rollback();
      return res.status(400).json({ message: `Không thể xóa danh mục vì còn ${movieCount} phim thuộc danh mục này.` });
    }
    
    // Delete category
    await conn.query('DELETE FROM Movie_Categories WHERE category_id=?', [id]);
    
    await conn.commit();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    await conn.rollback();
    console.error('deleteCategory error:', err);
    res.status(500).json({ message: 'Error deleting category' });
  } finally {
    conn.release();
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

// ─── Showtime Management ──────────────────────────────────────────────────────

/** GET /api/admin/showtimes/cinemas — danh sách rạp */
export const getShowtimeCinemas = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT cinemas_id AS id, cinema_name AS name, city FROM Cinemas ORDER BY cinema_name'
    );
    res.json({ cinemas: rows });
  } catch (err) {
    console.error('getShowtimeCinemas error:', err);
    res.json({ cinemas: [] });
  }
};

/** GET /api/admin/showtimes/rooms?cinemaId=1 — phòng chiếu */
export const getShowtimeRooms = async (req, res) => {
  try {
    const { cinemaId } = req.query;
    const where = cinemaId ? 'WHERE cinema_id = ?' : '';
    const params = cinemaId ? [cinemaId] : [];
    const [rows] = await db.query(
      `SELECT room_id AS id, cinema_id AS cinemaId, room_name AS name,
              room_type AS type, total_seat AS totalSeats
       FROM Rooms ${where} ORDER BY room_name`,
      params
    );
    res.json({ rooms: rows });
  } catch (err) {
    console.error('getShowtimeRooms error:', err);
    res.json({ rooms: [] });
  }
};

/** GET /api/admin/showtimes */
export const getShowtimes = async (req, res) => {
  try {
    const { cinemaId, date, status, search } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (cinemaId) { where += ' AND c.cinemas_id = ?'; params.push(cinemaId); }
    if (status && status !== 'all') { where += ' AND s.status = ?'; params.push(status); }
    if (date)   { where += ' AND DATE(s.start_time) = ?'; params.push(date); }
    if (search) {
      where += ' AND (m.title LIKE ? OR c.cinema_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(
      `SELECT
        s.showtime_id   AS id,
        s.movie_id      AS movieId,
        s.room_id       AS roomId,
        r.cinema_id     AS cinemaId,
        s.start_time    AS startTime,
        s.end_time      AS endTime,
        s.price,
        s.available_seats AS availableSeats,
        s.status,
        m.title         AS movieTitle,
        m.duration,
        r.room_name     AS roomName,
        r.room_type     AS roomType,
        r.total_seat    AS totalSeats,
        c.cinemas_id    AS cinemaDbId,
        c.cinema_name   AS cinemaName
       FROM Showtimes s
       JOIN Movies m  ON m.movie_id   = s.movie_id
       JOIN Rooms r   ON r.room_id    = s.room_id
       JOIN Cinemas c ON c.cinemas_id = r.cinema_id
       ${where}
       ORDER BY s.start_time DESC`,
      params
    );
    res.json({ showtimes: rows });
  } catch (err) {
    console.error('getShowtimes error:', err);
    res.json({ showtimes: [] });
  }
};

/** GET /api/admin/showtimes/:id */
export const getShowtimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const [[row]] = await db.query(
      `SELECT s.*, m.title AS movieTitle, m.duration,
              r.room_name AS roomName, r.room_type AS roomType, r.total_seat AS totalSeats,
              c.cinema_name AS cinemaName
       FROM Showtimes s
       JOIN Movies m  ON m.movie_id   = s.movie_id
       JOIN Rooms r   ON r.room_id    = s.room_id
       JOIN Cinemas c ON c.cinemas_id = r.cinema_id
       WHERE s.showtime_id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ message: 'Showtime not found' });
    res.json({ showtime: row });
  } catch (err) {
    console.error('getShowtimeById error:', err);
    res.status(500).json({ message: 'Error fetching showtime' });
  }
};

/** POST /api/admin/showtimes */
export const createShowtime = async (req, res) => {
  try {
    const { movieId, roomId, startTime, endTime, price, availableSeats, status = 'active' } = req.body;
    if (!movieId || !roomId || !startTime || !endTime || !price) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Kiểm tra conflict
    const [conflicts] = await db.query(
      `SELECT showtime_id FROM Showtimes
       WHERE room_id = ? AND status != 'cancelled'
         AND start_time < ? AND end_time > ?`,
      [roomId, endTime, startTime]
    );
    if (conflicts.length) {
      return res.status(409).json({ message: 'Phòng đã có suất chiếu trùng giờ', conflicts });
    }

    // Lấy total seats từ phòng nếu không truyền
    let seats = availableSeats;
    if (!seats) {
      const [[room]] = await db.query('SELECT total_seat FROM Rooms WHERE room_id = ?', [roomId]);
      seats = room?.total_seat || 0;
    }

    const [result] = await db.query(
      `INSERT INTO Showtimes (movie_id, room_id, start_time, end_time, price, available_seats, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [movieId, roomId, startTime, endTime, price, seats, status]
    );
    res.status(201).json({ message: 'Showtime created', showtimeId: result.insertId });
  } catch (err) {
    console.error('createShowtime error:', err);
    res.status(500).json({ message: 'Error creating showtime' });
  }
};

/** PUT /api/admin/showtimes/:id */
export const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const { movieId, roomId, startTime, endTime, price, availableSeats, status } = req.body;

    // Kiểm tra conflict (loại trừ chính nó)
    if (roomId && startTime && endTime) {
      const [conflicts] = await db.query(
        `SELECT showtime_id FROM Showtimes
         WHERE room_id = ? AND showtime_id != ? AND status != 'cancelled'
           AND start_time < ? AND end_time > ?`,
        [roomId, id, endTime, startTime]
      );
      if (conflicts.length) {
        return res.status(409).json({ message: 'Phòng đã có suất chiếu trùng giờ', conflicts });
      }
    }

    await db.query(
      `UPDATE Showtimes SET
        movie_id = COALESCE(?, movie_id),
        room_id  = COALESCE(?, room_id),
        start_time = COALESCE(?, start_time),
        end_time   = COALESCE(?, end_time),
        price      = COALESCE(?, price),
        available_seats = COALESCE(?, available_seats),
        status     = COALESCE(?, status)
       WHERE showtime_id = ?`,
      [movieId || null, roomId || null, startTime || null, endTime || null,
       price || null, availableSeats ?? null, status || null, id]
    );
    res.json({ message: 'Showtime updated' });
  } catch (err) {
    console.error('updateShowtime error:', err);
    res.status(500).json({ message: 'Error updating showtime' });
  }
};

/** DELETE /api/admin/showtimes/:id */
export const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    // Kiểm tra có vé đã đặt chưa
    const [[{ cnt }]] = await db.query(
      "SELECT COUNT(*) AS cnt FROM Tickets WHERE showtime_id = ? AND ticket_status != 'cancelled'",
      [id]
    );
    if (cnt > 0) {
      return res.status(400).json({ message: `Không thể xóa: có ${cnt} vé đã đặt cho suất chiếu này.` });
    }
    await db.query('DELETE FROM Showtimes WHERE showtime_id = ?', [id]);
    res.json({ message: 'Showtime deleted' });
  } catch (err) {
    console.error('deleteShowtime error:', err);
    res.status(500).json({ message: 'Error deleting showtime' });
  }
};

/** PUT /api/admin/showtimes/:id/cancel */
export const cancelShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE Showtimes SET status='cancelled' WHERE showtime_id = ?", [id]);
    res.json({ message: 'Showtime cancelled' });
  } catch (err) {
    console.error('cancelShowtime error:', err);
    res.status(500).json({ message: 'Error cancelling showtime' });
  }
};
