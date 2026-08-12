import { db } from '../../../config/db.js';
import bcrypt from 'bcryptjs';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
let emailVerificationSchemaReady = null;
let passwordResetSchemaReady = null;
let userNameSchemaReady = null;

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

const getCurrentDatabaseName = async () => {
  const [[row]] = await db.query('SELECT DATABASE() AS db_name');
  return row?.db_name || process.env.DB_NAME || 'Lunexa';
};

const hasColumn = async (databaseName, columnName) => {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'User' AND COLUMN_NAME = ?`,
    [databaseName, columnName]
  );
  return Number(row?.total || 0) > 0;
};

export const ensureUserNameSchema = async () => {
  if (userNameSchemaReady) {
    await userNameSchemaReady;
    return;
  }

  userNameSchemaReady = (async () => {
    const databaseName = await getCurrentDatabaseName();
    if (!(await hasColumn(databaseName, 'user_name'))) {
      await db.query('ALTER TABLE User ADD COLUMN user_name VARCHAR(50) NULL AFTER full_name');
    }

    const [indexes] = await db.query("SHOW INDEX FROM User WHERE Column_name = 'user_name' AND Non_unique = 0");
    if (!indexes.length) {
      await db.query('CREATE UNIQUE INDEX uq_user_user_name ON User (user_name)');
    }
  })();

  try {
    await userNameSchemaReady;
  } catch (error) {
    userNameSchemaReady = null;
    throw error;
  }
};

export const ensureEmailVerificationSchema = async () => {
  if (emailVerificationSchemaReady) {
    await emailVerificationSchemaReady;
    return;
  }

  emailVerificationSchemaReady = (async () => {
    await ensureUserNameSchema();
    const databaseName = await getCurrentDatabaseName();

    if (!(await hasColumn(databaseName, 'email_verified'))) {
      await db.query('ALTER TABLE User ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 1 AFTER status');
    }

    if (!(await hasColumn(databaseName, 'email_verify_token'))) {
      await db.query('ALTER TABLE User ADD COLUMN email_verify_token VARCHAR(128) NULL AFTER email_verified');
    }

    if (!(await hasColumn(databaseName, 'email_verify_expires'))) {
      await db.query('ALTER TABLE User ADD COLUMN email_verify_expires DATETIME NULL AFTER email_verify_token');
    }

    if (!(await hasColumn(databaseName, 'email_verified_at'))) {
      await db.query('ALTER TABLE User ADD COLUMN email_verified_at DATETIME NULL AFTER email_verify_expires');
    }

    if (!(await hasColumn(databaseName, 'must_change_password'))) {
      await db.query('ALTER TABLE User ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password');
    }
  })();

  try {
    await emailVerificationSchemaReady;
  } catch (error) {
    emailVerificationSchemaReady = null;
    throw error;
  }
};

export const ensurePasswordResetSchema = async () => {
  if (passwordResetSchemaReady) {
    await passwordResetSchemaReady;
    return;
  }

  passwordResetSchemaReady = (async () => {
    const databaseName = await getCurrentDatabaseName();

    if (!(await hasColumn(databaseName, 'password_reset_token'))) {
      await db.query('ALTER TABLE User ADD COLUMN password_reset_token VARCHAR(128) NULL AFTER email_verified_at');
    }

    if (!(await hasColumn(databaseName, 'password_reset_expires'))) {
      await db.query('ALTER TABLE User ADD COLUMN password_reset_expires DATETIME NULL AFTER password_reset_token');
    }
  })();

  try {
    await passwordResetSchemaReady;
  } catch (error) {
    passwordResetSchemaReady = null;
    throw error;
  }
};

export const findUserWithRoleByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const [[user]] = await db.query(
    `SELECT u.*, r.role_name, e.position AS employee_position
     FROM User u
     LEFT JOIN Roles r ON r.role_id = u.role_id
     LEFT JOIN Employees e ON e.user_id = u.id
     WHERE LOWER(u.email) = ? OR u.phone = ? OR LOWER(u.user_name) = ?
     LIMIT 1`,
    [normalizedEmail, String(email || '').trim(), normalizedEmail]
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

export const userNameExists = async (userName) => {
  const [[existing]] = await db.query(
    'SELECT id FROM User WHERE LOWER(user_name) = ? LIMIT 1',
    [normalizeEmail(userName)]
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

export const createUser = async (
  { roleId, full_name, user_name, email, password, phone, birthday, sex },
  connection = db,
) => {
  const [result] = await connection.query(
    `INSERT INTO User (role_id, full_name, user_name, email, password, phone, birthday, sex, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [roleId, full_name, user_name || null, email, password, phone || null, birthday || null, sex || null]
  );
  return result.insertId;
};

export const setEmailVerificationToken = async (userId, token, expiresAt, connection = db) => {
  await ensureEmailVerificationSchema();
  await connection.query(
    `UPDATE User
     SET email_verified = 0,
         email_verify_token = ?,
         email_verify_expires = ?,
         email_verified_at = NULL
     WHERE id = ?`,
    [token, expiresAt, userId]
  );
};

export const verifyEmailByToken = async (token) => {
  await ensureEmailVerificationSchema();

  const [result] = await db.query(
    `UPDATE User
     SET email_verified = 1,
         email_verify_token = NULL,
         email_verify_expires = NULL,
         email_verified_at = NOW(),
         updated_at = NOW()
     WHERE email_verify_token = ?
       AND email_verify_expires IS NOT NULL
       AND email_verify_expires >= NOW()
     LIMIT 1`,
    [token]
  );

  return Number(result?.affectedRows || 0) > 0;
};

export const findUserForResendVerification = async (email) => {
  await ensureEmailVerificationSchema();
  const normalizedEmail = normalizeEmail(email);

  const [[user]] = await db.query(
    `SELECT id, full_name, email, email_verified
     FROM User
     WHERE LOWER(email) = ?
     LIMIT 1`,
    [normalizedEmail]
  );

  return user || null;
};

export const findUserForPasswordReset = async (email) => {
  await ensurePasswordResetSchema();
  const normalizedEmail = normalizeEmail(email);

  const [[user]] = await db.query(
    `SELECT id, full_name, email, status
     FROM User
     WHERE LOWER(email) = ?
       AND status != 'blocked'
     LIMIT 1`,
    [normalizedEmail]
  );

  return user || null;
};

export const setPasswordResetToken = async (userId, token, expiresAt, connection = db) => {
  await ensurePasswordResetSchema();
  await connection.query(
    `UPDATE User
     SET password_reset_token = ?,
         password_reset_expires = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [token, expiresAt, userId]
  );
};

export const resetPasswordByToken = async (token, hashedPassword, connection = db) => {
  await ensurePasswordResetSchema();

  const [result] = await connection.query(
    `UPDATE User
     SET password = ?,
         password_reset_token = NULL,
         password_reset_expires = NULL,
         updated_at = NOW()
     WHERE password_reset_token = ?
       AND password_reset_expires IS NOT NULL
       AND password_reset_expires >= NOW()
     LIMIT 1`,
    [hashedPassword, token]
  );

  return Number(result?.affectedRows || 0) > 0;
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

export const seedDefaultAdminUser = async () => {
  try {
    await ensureUserNameSchema();
    await ensureEmailVerificationSchema();
    const [[existing]] = await db.query(
      'SELECT COUNT(*) AS cnt FROM User WHERE LOWER(email) = ? OR LOWER(user_name) = ?',
      ['admin@example.com', 'admin']
    );
    if (Number(existing?.cnt || 0) > 0) {
      return { created: false, message: 'Admin user already exists.' };
    }
    const adminRoleId = await ensureRoleExists('admin', 'System Administrator with full access');
    const userRoleId = await ensureRoleExists('user', 'Regular customer user');
    const staffRoleId = await ensureRoleExists('staff', 'Cinema staff');
    const managerRoleId = await ensureRoleExists('manager', 'Cinema manager');
    const technicianRoleId = await ensureRoleExists('technician', 'Technical staff');
    const hashedPassword = await bcrypt.hash('123456', 10);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const adminUserId = await createUser(
        {
          roleId: adminRoleId,
          full_name: 'Quản trị viên',
          user_name: 'admin',
          email: 'admin@example.com',
          password: hashedPassword,
          phone: '0900000000',
          birthday: '1990-01-01',
          sex: 'Nam',
        },
        connection
      );
      await connection.query(
        `UPDATE User SET email_verified = 1, email_verified_at = NOW() WHERE id = ?`,
        [adminUserId]
      );
      const [empResult] = await connection.query(
        `INSERT INTO Employees (user_id, full_name, position, phone, email, hire_date, status)
         VALUES (?, ?, 'Quản lý hệ thống', '0900000000', 'admin@example.com', CURDATE(), 'active')`,
        [adminUserId, 'Quản trị viên']
      );
      await connection.commit();
      return {
        created: true,
        message: 'Default admin user created successfully.',
        userId: adminUserId,
        employeeId: empResult.insertId,
        credentials: { email: 'admin@example.com', username: 'admin', password: '123456' },
      };
    } catch (txErr) {
      try { await connection.rollback(); } catch {}
      throw txErr;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[seedDefaultAdminUser] error:', err);
    return { created: false, error: err.message };
  }
};
