// Statistics model
import { db } from "../../../config/db.js";

let schemaCapabilitiesPromise;

const getSchemaCapabilities = async () => {
  if (schemaCapabilitiesPromise) return schemaCapabilitiesPromise;

  schemaCapabilitiesPromise = (async () => {
    const [cinemaCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Cinemas'",
    );

    const cinemaSet = new Set(cinemaCols.map((c) => c.COLUMN_NAME));

    return {
      cinemas: { hasStatus: cinemaSet.has("status") },
    };
  })();

  return schemaCapabilitiesPromise;
};

export const StatisticsModel = {
  async getCompleteStats(filters = {}) {
    try {
      const caps = await getSchemaCapabilities();

      // Helper function to execute query with fallback
      const safeQuery = async (sql, fallback = []) => {
        try {
          const [result] = await db.query(sql);
          return result;
        } catch (error) {
          console.error("Query failed:", sql, error);
          return fallback;
        }
      };

      // 1. Thống kê tổng quan
      const [userStats] = await safeQuery(
        "SELECT (SELECT COUNT(*) FROM User u JOIN Roles r ON u.role_id = r.role_id WHERE r.role_name = 'user') AS total_users",
        [{ total_users: 0 }],
      );

      const [movieStats] = await safeQuery(
        "SELECT (SELECT COUNT(*) FROM Movies WHERE is_deleted = 0) AS total_movies",
        [{ total_movies: 0 }],
      );

      const [revenueStats] = await safeQuery(
        "SELECT SUM(total_amount) AS total_revenue, COUNT(*) AS total_bookings FROM Orders",
        [{ total_revenue: 0, total_bookings: 0 }],
      );

      const [ticketStats] = await safeQuery(
        "SELECT COUNT(*) AS total_tickets FROM Tickets",
        [{ total_tickets: 0 }],
      );

      let activeCinemas = 0;
      if (caps.cinemas.hasStatus) {
        const [cinemaStats] = await safeQuery(
          "SELECT COUNT(*) AS active_cinemas FROM Cinemas WHERE status = 'active'",
          [{ active_cinemas: 0 }],
        );
        activeCinemas = cinemaStats?.active_cinemas || 0;
      } else {
        const [cinemaStats] = await safeQuery(
          "SELECT COUNT(*) AS active_cinemas FROM Cinemas",
          [{ active_cinemas: 0 }],
        );
        activeCinemas = cinemaStats?.active_cinemas || 0;
      }

      // 2. Doanh thu theo ngày
      const revenueByDay = await safeQuery(`
        SELECT
          DATE(o.created_at) AS date,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(o.created_at)
        ORDER BY date ASC
      `);

      // 3. Doanh thu theo tuần
      const revenueByWeek = await safeQuery(`
        SELECT
          YEAR(o.created_at) AS year,
          WEEK(o.created_at, 1) AS week,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
        GROUP BY YEAR(o.created_at), WEEK(o.created_at, 1)
        ORDER BY year DESC, week DESC
      `);

      // 4. Doanh thu theo tháng
      const revenueByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS month,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
        ORDER BY month ASC
      `);

      // 5. Top phim theo doanh thu
      const topMovies = await safeQuery(`
        SELECT
          m.movie_id,
          m.title,
          m.poster,
          COUNT(t.ticket_id) AS tickets_sold,
          COALESCE(SUM(o.total_amount), 0) AS revenue
        FROM Movies m
        LEFT JOIN Showtimes s ON m.movie_id = s.movie_id
        LEFT JOIN Tickets t ON s.showtime_id = t.showtime_id
        LEFT JOIN Orders o ON t.order_id = o.order_id
        GROUP BY m.movie_id, m.title, m.poster
        ORDER BY revenue DESC
        LIMIT 20
      `);

      // 6. Top rạp
      const topCinemas = await safeQuery(`
        SELECT
          c.cinemas_id AS cinema_id,
          c.cinema_name,
          c.city,
          COUNT(t.ticket_id) AS tickets_sold,
          COALESCE(SUM(o.total_amount), 0) AS revenue
        FROM Cinemas c
        LEFT JOIN Rooms r ON c.cinemas_id = r.cinema_id
        LEFT JOIN Showtimes s ON r.room_id = s.room_id
        LEFT JOIN Tickets t ON s.showtime_id = t.showtime_id
        LEFT JOIN Orders o ON t.order_id = o.order_id
        GROUP BY c.cinemas_id, c.cinema_name, c.city
        ORDER BY revenue DESC
        LIMIT 10
      `);

      // 7. Vé theo loại ghế
      const ticketSalesByType = await safeQuery(`
        SELECT
          seat.seat_type,
          COUNT(t.ticket_id) AS tickets_sold
        FROM Seats seat
        INNER JOIN Tickets t ON seat.seat_id = t.seat_id
        GROUP BY seat.seat_type
        HAVING COUNT(t.ticket_id) > 0
        ORDER BY tickets_sold DESC
      `);

      // 8. Top combo
      const comboSales = await safeQuery(`
        SELECT
          c.combo_id,
          c.combo_name,
          c.image,
          COALESCE(SUM(oc.quantity), 0) AS total_sold,
          COALESCE(SUM(oc.quantity * c.price), 0) AS revenue
        FROM Combos c
        LEFT JOIN Order_Combos oc ON c.combo_id = oc.combo_id
        LEFT JOIN Orders o ON oc.order_id = o.order_id
        GROUP BY c.combo_id, c.combo_name, c.image
        ORDER BY total_sold DESC
        LIMIT 10
      `);

      // 9. Tăng trưởng người dùng
      const userGrowth = await safeQuery(`
        SELECT
          DATE_FORMAT(created_at, '%Y-%m') AS month,
          COUNT(*) AS new_users
        FROM User u
        JOIN Roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'user'
        GROUP BY DATE_FORMAT(created_at, '%Y-%m')
        ORDER BY month ASC
        LIMIT 12
      `);

      // 10. Trạng thái đơn hàng
      const bookingStats = await safeQuery(`
        SELECT
          status,
          COUNT(*) AS count
        FROM Orders
        GROUP BY status
      `);

      return {
        overview: {
          total_bookings: revenueStats?.total_bookings || 0,
          total_tickets: ticketStats?.total_tickets || 0,
          total_revenue: revenueStats?.total_revenue || 0,
          total_users: userStats?.total_users || 0,
          total_movies: movieStats?.total_movies || 0,
          active_cinemas: activeCinemas,
        },
        revenueByDay,
        revenueByWeek,
        revenueByMonth,
        topMovies,
        topCinemas,
        ticketSalesByType,
        comboSales,
        userGrowth,
        bookingStats,
      };
    } catch (error) {
      console.error("StatisticsModel error:", error);
      throw error;
    }
  },
};
