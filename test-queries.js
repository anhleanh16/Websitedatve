import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Lunexa'
});

try {
  // Test the cinemaStats query
  const [cinemaStats] = await connection.query(`
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

  console.log('Cinema Stats:', cinemaStats);
  console.log('Count:', cinemaStats.length);

  // Test expenses query
  const [expenses] = await connection.query(`
    SELECT
      c.cinemas_id AS cinema_id,
      c.cinema_name,
      COALESCE(SUM(e.amount), 0) AS total_expenses
    FROM Cinemas c
    LEFT JOIN Expenses e ON c.cinemas_id = e.cinema_id AND e.paid_status = 'paid'
    GROUP BY c.cinemas_id, c.cinema_name
    ORDER BY total_expenses DESC
  `);

  console.log('\nExpenses:', expenses);

  // Test expenses by type query
  const [expensesByType] = await connection.query(`
    SELECT
      expense_type,
      COUNT(*) as count,
      COALESCE(SUM(amount), 0) as total_amount
    FROM Expenses
    WHERE paid_status = 'paid'
    GROUP BY expense_type
    ORDER BY total_amount DESC
  `);

  console.log('\nExpenses by Type:', expensesByType);

  await connection.end();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
