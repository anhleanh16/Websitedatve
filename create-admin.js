import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const password = 'Admin@123';
const hashedPassword = await bcrypt.hash(password, 10);

const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'Lunexa'
});

try {
  // First check if admin role exists
  const [roles] = await connection.query('SELECT role_id FROM Roles WHERE role_name = "admin"');
  let adminRoleId = roles[0]?.role_id;
  
  if (!adminRoleId) {
    // Create admin role if it doesn't exist
    const [result] = await connection.query('INSERT INTO Roles (role_name, description) VALUES (?, ?)', ['admin', 'Administrator']);
    adminRoleId = result.insertId;
    console.log('✓ Admin role created with ID:', adminRoleId);
  }
  
  // Check if admin user already exists
  const [existingUser] = await connection.query('SELECT id FROM User WHERE email = ?', ['admin@example.com']);
  
  if (existingUser.length === 0) {
    const [result] = await connection.query(
      'INSERT INTO User (full_name, email, password, role_id, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      ['Admin User', 'admin@example.com', hashedPassword, adminRoleId, '0901234567', 'active']
    );
    console.log('✓ Admin user created with ID:', result.insertId);
    console.log('Email: admin@example.com');
    console.log('Password:', password);
  } else {
    console.log('Admin user already exists');
  }
  
  await connection.end();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
