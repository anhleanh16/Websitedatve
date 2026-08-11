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

      // Tổng chi phí
      const [expenseStats] = await safeQuery(
        "SELECT SUM(amount) AS total_expenses FROM Expenses WHERE paid_status = 'paid'",
        [{ total_expenses: 0 }],
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

      // Tính lợi nhuận
      const totalRevenue = Number(revenueStats?.total_revenue || 0);
      const totalExpenses = Number(expenseStats?.total_expenses || 0);
      const totalProfit = totalRevenue - totalExpenses;

      // 2. Doanh thu theo ngày
      const revenueByDay = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND o.payment_status = 'paid'
          AND o.status IN ('confirmed', 'completed')
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
        ORDER BY date ASC
      `);

      // 2b. Chi phí theo ngày
      const expenseByDay = await safeQuery(`
        SELECT
          e.expense_date AS date,
          COALESCE(SUM(e.amount), 0) AS expenses,
          COUNT(DISTINCT e.expense_id) AS expense_count
        FROM Expenses e
        WHERE e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND e.paid_status = 'paid'
        GROUP BY e.expense_date
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

      // 4b. Chi phí theo tháng
      const expenseByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(e.expense_date, '%Y-%m') AS month,
          COALESCE(SUM(e.amount), 0) AS expenses,
          COUNT(DISTINCT e.expense_id) AS expense_count
        FROM Expenses e
        WHERE e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND e.paid_status = 'paid'
        GROUP BY DATE_FORMAT(e.expense_date, '%Y-%m')
        ORDER BY month ASC
      `);

      // 4c. Lợi nhuận theo tháng (Revenue - Expenses)
      const profitByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS month,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          0 AS expenses,
          COALESCE(SUM(o.total_amount), 0) AS profit
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

      // 5.5. Top rạp chiếu theo doanh thu
      const topCinemas = await safeQuery(`
        SELECT
          c.cinemas_id AS cinema_id,
          c.cinema_name,
          c.city,
          COUNT(DISTINCT t.ticket_id) AS tickets_sold,
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

      // 6. Thống kê chi tiết theo rạp
      const cinemaStats = await safeQuery(`
        SELECT
          c.cinemas_id AS cinema_id,
          c.cinema_name,
          c.city,
          c.phone,
          c.address,
          COUNT(DISTINCT t.ticket_id) AS tickets_sold,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings,
          COALESCE(COUNT(DISTINCT CASE WHEN DATE(o.created_at) = CURDATE() THEN o.order_id END), 0) AS today_bookings,
          COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN o.total_amount ELSE 0 END), 0) AS today_revenue
        FROM Cinemas c
        LEFT JOIN Rooms r ON c.cinemas_id = r.cinema_id
        LEFT JOIN Showtimes s ON r.room_id = s.room_id
        LEFT JOIN Tickets t ON s.showtime_id = t.showtime_id
        LEFT JOIN Orders o ON t.order_id = o.order_id
        GROUP BY c.cinemas_id, c.cinema_name, c.city, c.phone, c.address
        ORDER BY revenue DESC
      `);

      // 6b. Chi phí và lợi nhuận theo rạp
      const cinemaExpenseAndProfit = await safeQuery(`
        SELECT
          c.cinemas_id AS cinema_id,
          c.cinema_name,
          COALESCE(SUM(e.amount), 0) AS total_expenses,
          COALESCE(SUM(CASE WHEN e.expense_type = 'salary' THEN e.amount ELSE 0 END), 0) AS salary_expenses,
          COALESCE(SUM(CASE WHEN e.expense_type = 'utilities' THEN e.amount ELSE 0 END), 0) AS utility_expenses,
          COALESCE(SUM(CASE WHEN e.expense_type = 'maintenance' THEN e.amount ELSE 0 END), 0) AS maintenance_expenses,
          COALESCE(SUM(CASE WHEN e.expense_type = 'marketing' THEN e.amount ELSE 0 END), 0) AS marketing_expenses,
          COALESCE(SUM(CASE WHEN e.expense_type = 'other' THEN e.amount ELSE 0 END), 0) AS other_expenses
        FROM Cinemas c
        LEFT JOIN Expenses e ON c.cinemas_id = e.cinema_id AND e.paid_status = 'paid'
        GROUP BY c.cinemas_id, c.cinema_name
        ORDER BY total_expenses DESC
      `);

      // Merge cinema stats with expenses
      const enrichedCinemaStats = cinemaStats.map(cinema => {
        const expense = cinemaExpenseAndProfit.find(e => e.cinema_id === cinema.cinema_id) || {
          total_expenses: 0,
          salary_expenses: 0,
          utility_expenses: 0,
          maintenance_expenses: 0,
          marketing_expenses: 0,
          other_expenses: 0
        };
        return {
          ...cinema,
          ...expense,
          profit: Number(cinema.revenue) - Number(expense.total_expenses)
        };
      });

      // 6c. Người dùng theo rạp (dựa trên lịch sử booking)
      const usersByCinema = await safeQuery(`
        SELECT
          c.cinemas_id AS cinema_id,
          c.cinema_name,
          COUNT(DISTINCT o.user_id) AS total_users,
          COUNT(DISTINCT CASE WHEN DATE(o.created_at) = CURDATE() THEN o.user_id END) AS today_users
        FROM Cinemas c
        LEFT JOIN Rooms r ON c.cinemas_id = r.cinema_id
        LEFT JOIN Showtimes s ON r.room_id = s.room_id
        LEFT JOIN Tickets t ON s.showtime_id = t.showtime_id
        LEFT JOIN Orders o ON t.order_id = o.order_id
        GROUP BY c.cinemas_id, c.cinema_name
        ORDER BY total_users DESC
      `);

      // Merge users into enriched cinema stats
      const completeEnrichedCinemaStats = enrichedCinemaStats.map(cinema => {
        const users = usersByCinema.find(u => u.cinema_id === cinema.cinema_id) || {
          total_users: 0,
          today_users: 0
        };
        return {
          ...cinema,
          ...users
        };
      });

      // 7. Vé theo loại ghế
      const ticketSalesByType = await safeQuery(`
        SELECT
          COALESCE(seat.seat_type, 'Chưa phân bổ') AS seat_type,
          COUNT(t.ticket_id) AS tickets_sold
        FROM Tickets t
        LEFT JOIN Seats seat ON t.seat_id = seat.seat_id
        GROUP BY COALESCE(seat.seat_type, 'Chưa phân bổ')
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
          DATE_FORMAT(u.created_at, '%Y-%m') AS month,
          COUNT(*) AS new_users
        FROM User u
        JOIN Roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'user'
        GROUP BY DATE_FORMAT(u.created_at, '%Y-%m')
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

      // 11. Chi phí theo loại
      const expensesByType = await safeQuery(`
        SELECT
          expense_type,
          COALESCE(SUM(amount), 0) AS total_amount,
          COUNT(*) AS count
        FROM Expenses
        WHERE paid_status = 'paid'
        GROUP BY expense_type
        ORDER BY total_amount DESC
      `);

      return {
        overview: {
          total_bookings: revenueStats?.total_bookings || 0,
          total_tickets: ticketStats?.total_tickets || 0,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          total_profit: totalProfit,
          total_users: userStats?.total_users || 0,
          total_movies: movieStats?.total_movies || 0,
          active_cinemas: activeCinemas,
        },
        revenueByDay,
        expenseByDay,
        revenueByWeek,
        revenueByMonth,
        expenseByMonth,
        profitByMonth,
        topMovies,
        topCinemas,
        cinemaStats: completeEnrichedCinemaStats,
        ticketSalesByType,
        comboSales,
        userGrowth,
        bookingStats,
        expensesByType,
      };
    } catch (error) {
      console.error("StatisticsModel error:", error);
      throw error;
    }
  },
};
