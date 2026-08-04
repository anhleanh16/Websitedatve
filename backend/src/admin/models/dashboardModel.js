import { db } from "../../../config/db.js";

let movieColumnsCache = null;

const getMovieColumns = async () => {
  if (movieColumnsCache) return movieColumnsCache;
  const [rows] = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Movies'",
  );
  const set = new Set(rows.map((row) => row.COLUMN_NAME));
  movieColumnsCache = {
    hasIsDeleted: set.has("is_deleted"),
  };
  return movieColumnsCache;
};

export const DashboardModel = {
  /**
   * Lấy các số liệu thống kê chính cho trang dashboard.
   * @returns {Promise<Object>} Một đối tượng chứa các số liệu thống kê.
   */
  async getStats() {
    const movieColumns = await getMovieColumns();
    const movieFilter = movieColumns.hasIsDeleted ? " WHERE is_deleted = 0" : "";

    // Thống kê người dùng
    const [userStats] = await db.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM User u
          JOIN Roles r ON r.role_id = u.role_id
          WHERE r.role_name = 'user'
        ) AS total_customers,
        (
          SELECT COUNT(*)
          FROM User u
          JOIN Roles r ON r.role_id = u.role_id
          WHERE r.role_name IN ('admin', 'staff', 'manager', 'technician')
        ) AS total_staff
    `);

    // Thống kê phim
    const [movieStats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Movies${movieFilter}) AS total_movies,
        (SELECT COUNT(*) FROM Movies${movieFilter}${movieFilter ? " AND" : " WHERE"} status = 'now_showing') AS now_showing,
        (SELECT COUNT(*) FROM Movies${movieFilter}${movieFilter ? " AND" : " WHERE"} status = 'coming_soon') AS coming_soon
    `);

    // Thống kê doanh thu trong 30 ngày qua, dựa trên đơn đã thanh toán
    const [revenueStats] = await db.query(`
      SELECT
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(*) AS total_bookings
      FROM Orders
      WHERE payment_status = 'paid'
        AND status IN ('confirmed', 'completed')
        AND created_at >= NOW() - INTERVAL 30 DAY
    `);

    // Lấy các booking gần đây
    const [recentBookings] = await db.query(`
      SELECT
        o.order_id AS booking_id,
        o.booking_code,
        u.full_name,
        MIN(m.title) AS title,
        o.total_amount AS total_price,
        o.created_at
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      GROUP BY o.order_id, o.booking_code, u.full_name, o.total_amount, o.created_at
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    return {
      total_customers: userStats[0].total_customers || 0,
      total_staff: userStats[0].total_staff || 0,
      total_movies: movieStats[0].total_movies || 0,
      now_showing_movies: movieStats[0].now_showing || 0,
      coming_soon_movies: movieStats[0].coming_soon || 0,
      total_revenue: revenueStats[0].total_revenue || 0,
      total_bookings: revenueStats[0].total_bookings || 0,
      recent_bookings: recentBookings,
    };
  },
};
