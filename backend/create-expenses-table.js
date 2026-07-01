import mysql from 'mysql2/promise.js';

(async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'Lunexa'
  });

  try {
    // Create Expenses table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS Expenses (
        expense_id INT AUTO_INCREMENT PRIMARY KEY,
        cinema_id INT,
        expense_type ENUM('salary','utilities','maintenance','marketing','other') NOT NULL,
        description TEXT,
        amount DECIMAL(12,2) NOT NULL,
        expense_date DATE NOT NULL,
        paid_status ENUM('pending','paid') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (cinema_id) REFERENCES Cinemas(cinemas_id)
      )
    `);
    console.log('✓ Expenses table created');

    // Check if test data exists
    const [expenses] = await connection.execute('SELECT COUNT(*) as count FROM Expenses');
    if (expenses[0].count === 0) {
      await connection.execute(`
        INSERT INTO Expenses (cinema_id, expense_type, description, amount, expense_date, paid_status) VALUES
        (1, 'salary', 'Lương tháng 6', 50000000, '2026-06-30', 'paid'),
        (1, 'utilities', 'Điện nước tháng 6', 5000000, '2026-06-30', 'paid'),
        (2, 'salary', 'Lương tháng 6', 45000000, '2026-06-30', 'paid'),
        (2, 'utilities', 'Điện nước tháng 6', 4500000, '2026-06-30', 'paid'),
        (3, 'maintenance', 'Sửa chữa máy chiếu', 3000000, '2026-06-25', 'paid'),
        (4, 'marketing', 'Quảng cáo tháng 6', 2000000, '2026-06-01', 'paid'),
        (5, 'other', 'Lương bảo vệ', 8000000, '2026-06-30', 'paid')
      `);
      console.log('✓ Test data inserted');
    } else {
      console.log('✓ Expenses data already exists');
    }
  } catch (error) {
    if (!error.message.includes('already exists')) {
      console.error('Error:', error.message);
    } else {
      console.log('✓ Table already exists');
    }
  }
  
  await connection.end();
})();
