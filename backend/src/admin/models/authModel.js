import { db } from '../../../config/db.js';

export const findUserWithRoleByEmail = async (email) => {
  const [[user]] = await db.query(
    `SELECT u.*, r.role_name
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     WHERE u.email = ? AND u.status != 'blocked'
     LIMIT 1`,
    [email]
  );
  return user;
};

export const updateLastLogin = async (userId) => {
  await db.query('UPDATE User SET last_login = NOW() WHERE id = ?', [userId]);
};

export const emailExists = async (email) => {
  const [[existing]] = await db.query(
    'SELECT id FROM User WHERE email = ? LIMIT 1',
    [email]
  );
  return Boolean(existing);
};

export const getRoleIdByName = async (roleName) => {
  const [[roleRow]] = await db.query(
    'SELECT role_id FROM Roles WHERE role_name = ? LIMIT 1',
    [roleName]
  );
  return roleRow ? roleRow.role_id : null;
};

export const createUser = async ({ roleId, full_name, email, password, phone, birthday, sex }) => {
  const [result] = await db.query(
    `INSERT INTO User (role_id, full_name, email, password, phone, birthday, sex, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [roleId, full_name, email, password, phone || null, birthday || null, sex || null]
  );
  return result.insertId;
};

export const findUserById = async (userId) => {
  const [[user]] = await db.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.birthday, u.sex,
            u.avatar, u.point, u.status, r.role_name AS role
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     WHERE u.id = ?`,
    [userId]
  );
  return user;
};
