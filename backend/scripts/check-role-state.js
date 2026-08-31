import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sweetstarcinema',
});

try {
  const [roles] = await db.query('SELECT role_id, role_name, description FROM Roles ORDER BY role_id');
  const [users] = await db.query('SELECT id, role_id, full_name, email FROM User ORDER BY id LIMIT 20');
  const [employees] = await db.query('SELECT employee_id, user_id, employee_code, position, status FROM Employees ORDER BY employee_id LIMIT 20');

  console.log('ROLES');
  console.log(JSON.stringify(roles, null, 2));
  console.log('USERS');
  console.log(JSON.stringify(users, null, 2));
  console.log('EMPLOYEES');
  console.log(JSON.stringify(employees, null, 2));
} finally {
  await db.end();
}
