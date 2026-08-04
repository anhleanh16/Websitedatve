import { db } from '../../../config/db.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePositionText = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');

const mapEmployeePositionToRole = (position) => {
  const normalized = normalizePositionText(position);
  if (normalized.includes('quan ly') || normalized.includes('manager')) return 'manager';
  if (
    normalized.includes('ky thuat') ||
    normalized.includes('ki thuat') ||
    normalized.includes('thuat vien') ||
    normalized.includes('technician') ||
    normalized.includes('technical')
  ) return 'technician';
  return 'staff';
};

const deriveRoleFromEmployee = (user) => {
  if (Number(user.id) === 1) return 'admin';

  const position = String(user.employee_position || '').trim();
  return position ? mapEmployeePositionToRole(position) : 'user';
};

export const findUserWithRoleByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const [[user]] = await db.query(
    `SELECT u.*, r.role_name, e.position AS employee_position
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     LEFT JOIN Employees e ON e.user_id = u.id
     WHERE LOWER(u.email) = ? AND u.status != 'blocked'
     LIMIT 1`,
    [normalizedEmail]
  );
  if (!user) return null;
  const role = deriveRoleFromEmployee(user);
  return {
    ...user,
    role_name: role,
    role,
  };
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

export const getRoleIdByName = async (roleName, connection = db) => {
  const [[roleRow]] = await connection.query(
    'SELECT role_id FROM Roles WHERE role_name = ? LIMIT 1',
    [roleName]
  );
  return roleRow ? roleRow.role_id : null;
};

export const ensureRoleExists = async (roleName, description = '', connection = db) => {
  const roleId = await getRoleIdByName(roleName, connection);
  if (roleId) return roleId;
  const [result] = await connection.query(
    'INSERT INTO Roles (role_name, description) VALUES (?, ?)',
    [roleName, description]
  );
  return result.insertId;
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
            u.avatar, u.point, u.status, r.role_name AS role, e.position AS employee_position
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     LEFT JOIN Employees e ON e.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  if (!user) return user;
  return {
    ...user,
    role: deriveRoleFromEmployee(user),
  };
};
