import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Lunexa',
  timezone: '+07:00',
});

const email = 'staff@example.com';
const password = 'Staff@123456';
const fullName = 'Nhân viên test';
const phone = '0900000000';
const position = 'Nhân viên';

const main = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [roleRows] = await connection.query(
      'SELECT role_id FROM Roles WHERE role_name = ? LIMIT 1',
      ['staff'],
    );

    let roleId;
    if (roleRows.length > 0) {
      roleId = roleRows[0].role_id;
    } else {
      const [roleResult] = await connection.query(
        'INSERT INTO Roles (role_name, description) VALUES (?, ?)',
        ['staff', 'Nhân viên hệ thống'],
      );
      roleId = roleResult.insertId;
    }

    const [existingUserRows] = await connection.query(
      'SELECT id FROM User WHERE email = ? LIMIT 1',
      [email],
    );

    let userId;
    if (existingUserRows.length > 0) {
      userId = existingUserRows[0].id;
      await connection.query(
        'UPDATE User SET full_name = ?, password = ?, phone = ?, status = ? WHERE id = ?',
        [fullName, bcrypt.hashSync(password, 10), phone, 'active', userId],
      );
    } else {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const [userResult] = await connection.query(
        `INSERT INTO User (role_id, full_name, email, password, phone, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
        [roleId, fullName, email, hashedPassword, phone],
      );
      userId = userResult.insertId;
    }

    const [employeeRows] = await connection.query(
      'SELECT employee_id FROM Employees WHERE user_id = ? LIMIT 1',
      [userId],
    );

    if (employeeRows.length === 0) {
      await connection.query(
        `INSERT INTO Employees (user_id, employee_code, position, status, hire_date)
         VALUES (?, ?, ?, 'active', CURDATE())`,
        [userId, `STF${userId.toString().padStart(3, '0')}`, position],
      );
    } else {
      await connection.query(
        'UPDATE Employees SET position = ?, status = ? WHERE user_id = ?',
        [position, 'active', userId],
      );
    }

    await connection.commit();
    console.log(`Tài khoản nhân viên đã sẵn sàng:`);
    console.log(`Email: ${email}`);
    console.log(`Mật khẩu: ${password}`);
    console.log(`Role: staff`);
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi khi tạo tài khoản nhân viên:', error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
};

main();
