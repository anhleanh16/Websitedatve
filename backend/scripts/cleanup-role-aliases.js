import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const normalizeRoleName = (value = '') => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!normalized) return '';

  if (['user', 'customer', 'khach hang', 'khachhang', 'khách hang', 'khachhang'].includes(normalized)) {
    return 'user';
  }

  if (['admin', 'quan tri vien', 'quan tri', 'quan ly', 'quản trị viên', 'quản trị', 'quản lý'].includes(normalized)) {
    return 'admin';
  }

  if (['employee', 'staff', 'nhan vien', 'nhân viên', 'manager', 'technician', 'quan ly', 'quản lý'].includes(normalized)) {
    return 'employee';
  }

  return normalized;
};

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sweetstarcinema',
  multipleStatements: true,
});

try {
  console.log('Starting role cleanup...');

  const [existingRoles] = await connection.query(
    'SELECT role_id, role_name, description FROM Roles ORDER BY role_id'
  );

  const canonicalRoleIds = {
    admin: null,
    user: null,
    employee: null,
  };

  for (const row of existingRoles) {
    const canonicalName = normalizeRoleName(row.role_name);
    if (!canonicalName) continue;
    if (!canonicalRoleIds[canonicalName]) {
      canonicalRoleIds[canonicalName] = Number(row.role_id);
    }
  }

  const canonicalEntries = [
    ['admin', 'quản lý'],
    ['user', 'Khách hàng thông thường'],
    ['employee', 'nhân viên'],
  ];

  for (const [canonicalName, description] of canonicalEntries) {
    if (!canonicalRoleIds[canonicalName]) {
      const [result] = await connection.query(
        'INSERT INTO Roles (role_name, description) VALUES (?, ?)',
        [canonicalName, description],
      );
      canonicalRoleIds[canonicalName] = Number(result.insertId);
      console.log(`Inserted canonical role: ${canonicalName} -> role_id ${canonicalRoleIds[canonicalName]}`);
    }
  }

  const duplicatesByCanonical = new Map();

  for (const row of existingRoles) {
    const canonicalName = normalizeRoleName(row.role_name);
    if (!canonicalName) continue;
    const canonicalId = canonicalRoleIds[canonicalName];
    if (!canonicalId) continue;

    if (!duplicatesByCanonical.has(canonicalName)) {
      duplicatesByCanonical.set(canonicalName, []);
    }

    duplicatesByCanonical.get(canonicalName).push(Number(row.role_id));
  }

  for (const [canonicalName, ids] of duplicatesByCanonical.entries()) {
    const keepId = canonicalRoleIds[canonicalName];
    const toReplace = ids.filter((id) => id !== keepId);
    if (toReplace.length === 0) continue;

    const placeholders = toReplace.map(() => '?').join(', ');
    await connection.query(
      `UPDATE User SET role_id = ? WHERE role_id IN (${placeholders})`,
      [keepId, ...toReplace],
    );

    await connection.query(
      `DELETE FROM Roles
       WHERE role_id IN (${placeholders})
         AND NOT EXISTS (SELECT 1 FROM User WHERE User.role_id = Roles.role_id)`,
      toReplace,
    );

    console.log(`Merged ${canonicalName} aliases into role_id ${keepId}: removed ${toReplace.join(', ')}`);
  }

  const [finalRoles] = await connection.query(
    'SELECT role_id, role_name, description FROM Roles ORDER BY role_id'
  );
  console.log('Final roles:', JSON.stringify(finalRoles, null, 2));
  console.log('Role cleanup complete.');
} finally {
  await connection.end();
}
