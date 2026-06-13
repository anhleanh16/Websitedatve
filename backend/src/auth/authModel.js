import { db } from '../../config/db.js';

/* Tìm user theo email (kèm role_name), bỏ qua tài khoản bị block */
export const findUserByEmail = async (email) => {
  const [[user]] = await db.query(
    `SELECT u.*, r.role_name
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     WHERE u.email = ? AND u.status != 'blocked'
     LIMIT 1`,
    [email]
  );
  return user || null;
};

/* Cập nhật thời gian đăng nhập cuối */
export const updateLastLogin = async (userId) => {
  await db.query('UPDATE User SET last_login = NOW() WHERE id = ?', [userId]);
};

/* Kiểm tra email đã tồn tại */
export const emailExists = async (email) => {
  const [[row]] = await db.query(
    'SELECT id FROM User WHERE email = ? LIMIT 1',
    [email]
  );
  return !!row;
};

/* Lấy role_id theo tên role */
export const getRoleIdByName = async (roleName) => {
  const [[row]] = await db.query(
    'SELECT role_id FROM Roles WHERE role_name = ? LIMIT 1',
    [roleName]
  );
  return row ? row.role_id : null;
};

/* Tạo user mới, trả về insertId */
export const createUser = async ({ roleId, full_name, email, hashedPassword, phone, birthday, sex }) => {
  const [result] = await db.query(
    `INSERT INTO User (role_id, full_name, email, password, phone, birthday, sex, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [roleId, full_name, email, hashedPassword, phone || null, birthday || null, sex || null]
  );
  return result.insertId;
};

/* Lấy profile theo userId */
export const findUserById = async (userId) => {
  const [[user]] = await db.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.birthday, u.sex,
            u.avatar, u.point, u.status, r.role_name AS role
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     WHERE u.id = ?`,
    [userId]
  );
  return user || null;
};
