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

const buildOrderDateFilter = (column = "o.created_at", period, startDate, endDate, paid = true) => {
  const clauses = [];
  if (paid) clauses.push("o.payment_status = 'paid' AND o.status IN ('confirmed', 'completed')");
  if (startDate) clauses.push(`DATE(${column}) >= DATE('${String(startDate).replace(/'/g, "''")}')`);
  if (endDate)   clauses.push(`DATE(${column}) <= DATE('${String(endDate).replace(/'/g, "''")}')`);
  if (period === "week")   clauses.push(`YEARWEEK(${column}, 1) = YEARWEEK(CURDATE(), 1)`);
  if (period === "month")  clauses.push(`YEAR(${column}) = YEAR(CURDATE()) AND MONTH(${column}) = MONTH(CURDATE())`);
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
};

const buildExpenseDateFilter = (column = "e.expense_date", period, startDate, endDate) => {
  const clauses = ["e.paid_status = 'paid'"];
  if (startDate) clauses.push(`DATE(${column}) >= DATE('${String(startDate).replace(/'/g, "''")}')`);
  if (endDate)   clauses.push(`DATE(${column}) <= DATE('${String(endDate).replace(/'/g, "''")}')`);
  if (period === "week")   clauses.push(`YEARWEEK(${column}, 1) = YEARWEEK(CURDATE(), 1)`);
  if (period === "month")  clauses.push(`YEAR(${column}) = YEAR(CURDATE()) AND MONTH(${column}) = MONTH(CURDATE())`);
  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
};

const buildUserDateFilter = (column = "u.created_at", period, startDate, endDate) => {
  const clauses = [];
  if (startDate) clauses.push(`DATE(${column}) >= DATE('${String(startDate).replace(/'/g, "''")}')`);
  if (endDate)   clauses.push(`DATE(${column}) <= DATE('${String(endDate).replace(/'/g, "''")}')`);
  if (period === "week")   clauses.push(`YEARWEEK(${column}, 1) = YEARWEEK(CURDATE(), 1)`);
  if (period === "month")  clauses.push(`YEAR(${column}) = YEAR(CURDATE()) AND MONTH(${column}) = MONTH(CURDATE())`);
  return clauses.length ? `AND ${clauses.join(" AND ")}` : "";
};

export const StatisticsModel = {
  async getCompleteStats(filters = {}) {
    try {
      const caps = await getSchemaCapabilities();
      const period = String(filters.period || "total").toLowerCase();
      const startDate = filters.startDate || "";
      const endDate = filters.endDate || "";
      const cinemaId = filters.cinemaId ? Number(filters.cinemaId) : null;

      const safeQuery = async (sql, fallback = []) => {
        try {
          const [result] = await db.query(sql);
          return result;
        } catch (error) {
          console.error("Query failed:", sql.substring(0, 200), error.message);
          return fallback;
        }
      };

      const cinemaFilterOrders = cinemaId ? ` AND c.cinemas_id = ${cinemaId}` : "";
      const cinemaFilterExpenses = cinemaId ? ` AND e.cinema_id = ${cinemaId}` : "";

      const orderFilterAll = buildOrderDateFilter("o.created_at", period, startDate, endDate, true);
      const orderFilterNoPaid = buildOrderDateFilter("o.created_at", period, startDate, endDate, false);
      const expenseFilterAll = buildExpenseDateFilter("e.expense_date", period, startDate, endDate);
      const userFilterAll = buildUserDateFilter("u.created_at", period, startDate, endDate);
      const userFilterNoPeriod = buildUserDateFilter("u.created_at", "", "", "");

      const [userStats] = await safeQuery(
        `SELECT (
           SELECT COUNT(*) FROM User u
           JOIN Roles r ON u.role_id = r.role_id
           WHERE r.role_name = 'user' ${userFilterNoPeriod === "" ? "" : userFilterAll}
         ) AS total_users`,
        [{ total_users: 0 }],
      );

      const [movieStats] = await safeQuery(
        "SELECT (SELECT COUNT(*) FROM Movies WHERE is_deleted = 0) AS total_movies",
        [{ total_movies: 0 }],
      );

      const [revenueStats] = await safeQuery(
        `SELECT COALESCE(SUM(total_amount), 0) AS total_revenue, COUNT(*) AS total_bookings
         FROM Orders o
         ${orderFilterAll === "" ? "" : orderFilterAll.replace(/^WHERE /, "WHERE o.payment_status = 'paid' AND o.status IN ('confirmed','completed') AND ")}
        `,
        [{ total_revenue: 0, total_bookings: 0 }],
      );

      const [ticketStats] = await safeQuery(
        `SELECT COUNT(*) AS total_tickets FROM Tickets t
         LEFT JOIN Orders o ON t.order_id = o.order_id
         ${orderFilterAll === "" ? "" : orderFilterAll}
        `,
        [{ total_tickets: 0 }],
      );

      const [expenseStats] = await safeQuery(
        `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM Expenses e
         ${expenseFilterAll}${cinemaFilterExpenses}
        `,
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

      const totalRevenue = Number(revenueStats?.total_revenue || 0);
      const totalExpenses = Number(expenseStats?.total_expenses || 0);
      const totalProfit = totalRevenue - totalExpenses;

      const revenueByDay = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND o.payment_status = 'paid'
          AND o.status IN ('confirmed', 'completed')
          ${cinemaId ? ` AND o.order_id IN (
            SELECT DISTINCT o2.order_id FROM Orders o2
            JOIN Tickets t ON o2.order_id = t.order_id
            JOIN Showtimes s ON t.showtime_id = s.showtime_id
            JOIN Rooms r ON s.room_id = r.room_id
            JOIN Cinemas c ON r.cinema_id = c.cinemas_id
            WHERE c.cinemas_id = ${cinemaId}
          )` : ""}
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
        ORDER BY date ASC
      `);

      const expenseByDay = await safeQuery(`
        SELECT
          e.expense_date AS date,
          COALESCE(SUM(e.amount), 0) AS expenses,
          COUNT(DISTINCT e.expense_id) AS expense_count
        FROM Expenses e
        WHERE e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND e.paid_status = 'paid'
          ${cinemaFilterExpenses}
        GROUP BY e.expense_date
        ORDER BY date ASC
      `);

      const revenueByWeek = await safeQuery(`
        SELECT
          YEAR(o.created_at) AS year,
          WEEK(o.created_at, 1) AS week,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
          AND o.payment_status = 'paid'
          AND o.status IN ('confirmed', 'completed')
          ${cinemaId ? ` AND o.order_id IN (
            SELECT DISTINCT o2.order_id FROM Orders o2
            JOIN Tickets t ON o2.order_id = t.order_id
            JOIN Showtimes s ON t.showtime_id = s.showtime_id
            JOIN Rooms r ON s.room_id = r.room_id
            JOIN Cinemas c ON r.cinema_id = c.cinemas_id
            WHERE c.cinemas_id = ${cinemaId}
          )` : ""}
        GROUP BY YEAR(o.created_at), WEEK(o.created_at, 1)
        ORDER BY year DESC, week DESC
      `);

      const revenueByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS month,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          COUNT(DISTINCT o.order_id) AS bookings
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          AND o.payment_status = 'paid'
          AND o.status IN ('confirmed', 'completed')
          ${cinemaId ? ` AND o.order_id IN (
            SELECT DISTINCT o2.order_id FROM Orders o2
            JOIN Tickets t ON o2.order_id = t.order_id
            JOIN Showtimes s ON t.showtime_id = s.showtime_id
            JOIN Rooms r ON s.room_id = r.room_id
            JOIN Cinemas c ON r.cinema_id = c.cinemas_id
            WHERE c.cinemas_id = ${cinemaId}
          )` : ""}
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
        ORDER BY month ASC
      `);

      const expenseByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(e.expense_date, '%Y-%m') AS month,
          COALESCE(SUM(e.amount), 0) AS expenses,
          COUNT(DISTINCT e.expense_id) AS expense_count
        FROM Expenses e
        WHERE e.expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND e.paid_status = 'paid'
          ${cinemaFilterExpenses}
        GROUP BY DATE_FORMAT(e.expense_date, '%Y-%m')
        ORDER BY month ASC
      `);

      const profitByMonth = await safeQuery(`
        SELECT
          DATE_FORMAT(o.created_at, '%Y-%m') AS month,
          COALESCE(SUM(o.total_amount), 0) AS revenue,
          0 AS expenses,
          COALESCE(SUM(o.total_amount), 0) AS profit
        FROM Orders o
        WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          AND o.payment_status = 'paid'
          AND o.status IN ('confirmed', 'completed')
          ${cinemaId ? ` AND o.order_id IN (
            SELECT DISTINCT o2.order_id FROM Orders o2
            JOIN Tickets t ON o2.order_id = t.order_id
            JOIN Showtimes s ON t.showtime_id = s.showtime_id
            JOIN Rooms r ON s.room_id = r.room_id
            JOIN Cinemas c ON r.cinema_id = c.cinemas_id
            WHERE c.cinemas_id = ${cinemaId}
          )` : ""}
        GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
        ORDER BY month ASC
      `);

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
        ${orderFilterAll}
        ${cinemaId ? ` AND s.room_id IN (
          SELECT r.room_id FROM Rooms r WHERE r.cinema_id = ${cinemaId}
        )` : ""}
        GROUP BY m.movie_id, m.title, m.poster
        ORDER BY revenue DESC
        LIMIT 20
      `);

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
        ${orderFilterAll}
        ${cinemaFilterOrders}
        GROUP BY c.cinemas_id, c.cinema_name, c.city
        ORDER BY revenue DESC
        LIMIT 10
      `);

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
        ${orderFilterAll}
        ${cinemaFilterOrders}
        GROUP BY c.cinemas_id, c.cinema_name, c.city, c.phone, c.address
        ORDER BY revenue DESC
      `);

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
        ${expenseFilterAll === "" ? "" : expenseFilterAll.replace(/^WHERE /, "WHERE ") + cinemaFilterExpenses.replace(/^ AND /, " AND ")}
        GROUP BY c.cinemas_id, c.cinema_name
        ORDER BY total_expenses DESC
      `);

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
        ${orderFilterAll}
        ${cinemaFilterOrders}
        GROUP BY c.cinemas_id, c.cinema_name
        ORDER BY total_users DESC
      `);

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

      const ticketSalesByType = await safeQuery(`
        SELECT
          COALESCE(seat.seat_type, 'Chưa phân bổ') AS seat_type,
          COUNT(t.ticket_id) AS tickets_sold
        FROM Tickets t
        LEFT JOIN Seats seat ON t.seat_id = seat.seat_id
        LEFT JOIN Orders o ON t.order_id = o.order_id
        ${orderFilterAll}
        ${cinemaId ? ` AND t.showtime_id IN (
          SELECT s.showtime_id FROM Showtimes s
          JOIN Rooms r ON s.room_id = r.room_id
          WHERE r.cinema_id = ${cinemaId}
        )` : ""}
        GROUP BY COALESCE(seat.seat_type, 'Chưa phân bổ')
        HAVING COUNT(t.ticket_id) > 0
        ORDER BY tickets_sold DESC
      `);

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
        ${orderFilterAll}
        GROUP BY c.combo_id, c.combo_name, c.image
        ORDER BY total_sold DESC
        LIMIT 10
      `);

      const userGrowth = await safeQuery(`
        SELECT
          DATE_FORMAT(u.created_at, '%Y-%m') AS month,
          COUNT(*) AS new_users
        FROM User u
        JOIN Roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'user'
          ${userFilterAll === "" ? "" : userFilterAll}
        GROUP BY DATE_FORMAT(u.created_at, '%Y-%m')
        ORDER BY month ASC
        LIMIT 12
      `);

      const bookingStats = await safeQuery(`
        SELECT
          status,
          COUNT(*) AS count
        FROM Orders o
        ${orderFilterNoPaid === "" ? "" : orderFilterNoPaid}
        GROUP BY status
      `);

      const expensesByType = await safeQuery(`
        SELECT
          expense_type,
          COALESCE(SUM(amount), 0) AS total_amount,
          COUNT(*) AS count
        FROM Expenses e
        ${expenseFilterAll}${cinemaFilterExpenses}
        GROUP BY expense_type
        ORDER BY total_amount DESC
      `);

      return {
        meta: { period, startDate, endDate, cinemaId },
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
