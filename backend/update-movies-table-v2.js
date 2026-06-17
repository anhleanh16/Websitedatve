import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

console.log('Đang cập nhật bảng Movies...');

try {
  // Thêm trường posters, is_deleted, is_hidden vào bảng Movies
  await db.query(`
    ALTER TABLE Movies 
    ADD COLUMN IF NOT EXISTS posters JSON DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_deleted TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_hidden TINYINT(1) DEFAULT 0
  `);
  
  console.log('Đã cập nhật bảng Movies thành công!');
  
} catch (err) {
  console.error('Lỗi khi cập nhật bảng Movies:', err);
} finally {
  await db.end();
  process.exit(0);
}