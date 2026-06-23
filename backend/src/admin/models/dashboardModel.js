import { db } from "../../../config/db.js";

export const DashboardModel = {
  /**
   * Lấy các số liệu thống kê chính cho trang dashboard.
   * @returns {Promise<Object>} Một đối tượng chứa các số liệu thống kê.
   */
  async getStats() {
    // Thống kê người dùng
    const [userStats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM Users WHERE role IN ('admin', 'staff')) AS total_staff
    `);

    // Thống kê phim
    const [movieStats] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM Movies WHERE is_deleted = 0) AS total_movies,
        (SELECT COUNT(*) FROM Movies WHERE status = 'now_showing' AND is_deleted = 0) AS now_showing,
        (SELECT COUNT(*) FROM Movies WHERE status = 'coming_soon' AND is_deleted = 0) AS coming_soon
    `);

    // Thống kê doanh thu (ví dụ: trong 30 ngày qua)
    const [revenueStats] = await db.query(`
      SELECT
        SUM(total_price) AS total_revenue,
        COUNT(*) AS total_bookings
      FROM Bookings
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL 30 DAY
    `);

    // Lấy các booking gần đây
    const [recentBookings] = await db.query(`
      SELECT b.booking_id, u.full_name, m.title, b.total_price, b.created_at
      FROM Bookings b
      JOIN Users u ON b.user_id = u.user_id
      JOIN Showtimes s ON b.showtime_id = s.showtime_id
      JOIN Movies m ON s.movie_id = m.movie_id
      ORDER BY b.created_at DESC
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
