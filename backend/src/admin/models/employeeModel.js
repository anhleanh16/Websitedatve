import bcrypt from "bcryptjs";
import { db } from "../../../config/db.js";
import { getRoleIdByName } from "./authModel.js";

/* ── Đảm bảo bảng Employees có đủ cột ─────────────────────────────── */
let schemaMigrated = false;
let canonicalRolesReady = null;
export const ensureEmployeeSchema = async () => {
  if (schemaMigrated) return;
  const add = async (col, definition) => {
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employees' AND COLUMN_NAME = ?`,
      [col],
    );
    if (!cols.length) {
      await db.query(`ALTER TABLE Employees ADD COLUMN ${definition}`);
    }
  };
  await add("department",   "department VARCHAR(100) NULL");
  await add("type",         "type ENUM('full_time','part_time') NOT NULL DEFAULT 'full_time'");
  await add("shifts",       "shifts VARCHAR(100) NULL COMMENT 'CSV: morning,afternoon,night'");
  await add("address",      "address TEXT NULL");
  await add("sex",          "sex VARCHAR(10) NULL");
  await add("dob",          "dob DATE NULL");
  await add("avatar_url",   "avatar_url VARCHAR(255) NULL");
  await add("citizen_id",   "citizen_id VARCHAR(20) NULL");
  await add("id_card_front_url", "id_card_front_url VARCHAR(255) NULL");
  await add("id_card_back_url",  "id_card_back_url VARCHAR(255) NULL");
  await add("cinema_id",    "cinema_id INT NULL");
  await add("created_at",   "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  await add("updated_at",   "updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP");
  const [[statusColumn]] = await db.query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Employees' AND COLUMN_NAME = 'status'`,
  );
  if (statusColumn && !String(statusColumn.COLUMN_TYPE).includes("'leave'")) {
    await db.query("ALTER TABLE Employees MODIFY COLUMN status ENUM('active','inactive','leave') NOT NULL DEFAULT 'active'");
  }
  schemaMigrated = true;
};

const ensureCanonicalRoles = async (connection = db) => {
  if (canonicalRolesReady) {
    await canonicalRolesReady;
    return;
  }

  canonicalRolesReady = (async () => {
    const canonicalRoles = [
      ["admin", "quản lý"],
      ["user", "Khách hàng thông thường"],
      ["employee", "nhân viên"],
    ];

    const legacyCustomerQuery = await connection.query(
      "SELECT role_id, role_name FROM Roles WHERE LOWER(role_name) IN ('customer', 'khach hang', 'khachhang', 'khách hàng', 'kháchhang')",
    );
    const legacyCustomerRoles = legacyCustomerQuery[0] || [];
    const userRoleId = await getRoleIdByName("user", connection);
    for (const legacyRole of legacyCustomerRoles) {
      await connection.query(
        "UPDATE User SET role_id = ? WHERE role_id = ?",
        [userRoleId, legacyRole.role_id],
      );
      await connection.query(
        "DELETE FROM Roles WHERE role_id = ? AND NOT EXISTS (SELECT 1 FROM User WHERE User.role_id = Roles.role_id)",
        [legacyRole.role_id],
      );
    }

    const legacyEmployeeQuery = await connection.query(
      "SELECT role_id, role_name FROM Roles WHERE LOWER(role_name) IN ('staff', 'manager', 'technician', 'nhan vien', 'nhân viên', 'quan ly', 'quản lý')",
    );
    const legacyEmployeeRoles = legacyEmployeeQuery[0] || [];
    const employeeRoleIdForLegacy = await getRoleIdByName("employee", connection);
    for (const legacyRole of legacyEmployeeRoles) {
      await connection.query(
        "UPDATE User SET role_id = ? WHERE role_id = ?",
        [employeeRoleIdForLegacy, legacyRole.role_id],
      );
      await connection.query(
        "DELETE FROM Roles WHERE role_id = ? AND NOT EXISTS (SELECT 1 FROM User WHERE User.role_id = Roles.role_id)",
        [legacyRole.role_id],
      );
    }

    for (const [roleName, description] of canonicalRoles) {
      const existingRoleId = await getRoleIdByName(roleName, connection);
      if (!existingRoleId) {
        await connection.query(
          "INSERT INTO Roles (role_name, description) VALUES (?, ?)",
          [roleName, description],
        );
      }
    }

    const employeeRoleId = await getRoleIdByName("employee", connection);
    await connection.query(
      `UPDATE User u
       JOIN Roles r ON r.role_id = u.role_id
       SET u.role_id = ?
       WHERE r.role_name IN ('staff', 'manager', 'technician')
          OR (r.role_name = 'admin' AND u.id <> 1 AND EXISTS (
            SELECT 1 FROM Employees e WHERE e.user_id = u.id
          ))`,
      [employeeRoleId],
    );
  })();

  try {
    await canonicalRolesReady;
  } catch (error) {
    canonicalRolesReady = null;
    throw error;
  }
};

/* ── Format row ─────────────────────────────────────────────────────── */
const formatDateInput = (value) => {
  if (!value) return "";
  const isoDate = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const normalizeDateForDb = (value) => formatDateInput(value) || null;

const fmt = (row) => ({
  id:           Number(row.employee_id),
  userId:       row.user_id ? Number(row.user_id) : null,
  code:         row.employee_code || "",
  name:         row.full_name     || row.name || "",
  email:        row.email         || "",
  phone:        row.phone         || "",
  position:     row.position      || "",
  department:   row.department    || "",
  type:         row.type          || "full_time",
  shifts:       row.shifts        ? row.shifts.split(",").filter(Boolean) : [],
  hireDate:     formatDateInput(row.hire_date),
  salary:       Number(row.salary || 0),
  status:       row.status        || "active",
  sex:          row.sex           || "",
  dob:          formatDateInput(row.dob),
  address:      row.address       || "",
  avatarUrl:    row.avatar_url    || "",
  citizenId:    row.citizen_id    || "",
  idCardFrontUrl: row.id_card_front_url || "",
  idCardBackUrl:  row.id_card_back_url  || "",
  cinemaId:     row.cinema_id     ? Number(row.cinema_id) : null,
  cinemaName:   row.cinema_name   || "",
  createdAt:    row.created_at    || null,
});

const normalizeEmail = (value) => (value ? String(value).trim().toLowerCase() : "");

const resolveEmployeeRoleId = async (connection = db) => getRoleIdByName("employee", connection);

const resolveUserRoleIdForEmployee = async (userId, connection = db) => {
  const [[user]] = await connection.query('SELECT role_id FROM User WHERE id = ? LIMIT 1', [userId]);
  if (!user) return await resolveEmployeeRoleId(connection);
  const adminRoleId = await getRoleIdByName('admin', connection);
  if (Number(userId) === 1) return adminRoleId;
  return await resolveEmployeeRoleId(connection);
};

const resolveOrCreateUser = async (data, connection = db) => {
  const requestedUserId = data.userId !== undefined && data.userId !== null && data.userId !== ""
    ? Number(data.userId)
    : null;

  if (requestedUserId) {
    if (requestedUserId === 1) {
      const error = new Error("Không thể thêm tài khoản quản trị viên vào danh sách nhân viên.");
      error.statusCode = 400;
      throw error;
    }
    const [[user]] = await connection.query("SELECT id, role_id FROM User WHERE id = ? LIMIT 1", [requestedUserId]);
    if (user) {
      const roleId = await resolveUserRoleIdForEmployee(requestedUserId, connection);
      if (roleId && roleId !== user.role_id) {
        await connection.query('UPDATE User SET role_id = ? WHERE id = ?', [roleId, requestedUserId]);
      }
      return requestedUserId;
    }
  }

  const name = data.name || data.full_name || "";
  const email = normalizeEmail(data.email);
  const phone = data.phone ? String(data.phone).trim() : "";
  const code = data.code || data.employee_code || "";

  if (!name && !email && !phone) return null;

  const candidateEmail = email || `${String(code || "employee").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "employee"}@local.invalid`;

  const [existingRows] = await connection.query(
    "SELECT id, role_id FROM User WHERE email = ? OR phone = ? LIMIT 1",
    [candidateEmail, phone || null],
  );

  if (existingRows.length) {
    const existingUserId = Number(existingRows[0].id);
    const roleId = await resolveUserRoleIdForEmployee(existingUserId, connection);
    if (roleId && roleId !== existingRows[0].role_id) {
      await connection.query('UPDATE User SET role_id = ? WHERE id = ?', [roleId, existingUserId]);
    }
    return existingUserId;
  }

  const roleId = await resolveEmployeeRoleId(connection);
  const passwordHash = await bcrypt.hash("12345678", 10);
  const [result] = await connection.query(
    `INSERT INTO User (role_id, full_name, email, password, phone, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', NOW())`,
    [roleId, name || code || "Nhân viên", candidateEmail, passwordHash, phone || null],
  );

  return Number(result.insertId);
};

export const EmployeeModel = {
  async findAll(filters = {}) {
    await ensureEmployeeSchema();
    await ensureCanonicalRoles();
    let sql = `
      SELECT e.*,
             u.full_name, u.email, u.phone, u.sex, u.birthday AS dob,
             c.cinema_name
      FROM Employees e
      LEFT JOIN User u ON u.id = e.user_id
            LEFT JOIN Roles r ON r.role_id = u.role_id
      LEFT JOIN Cinemas c ON c.cinemas_id = e.cinema_id
    `;
    const params = [];
    const where = [];

    if (filters.status) { where.push("e.status = ?"); params.push(filters.status); }
    if (filters.cinemaId) { where.push("e.cinema_id = ?"); params.push(filters.cinemaId); }
    if (filters.department) { where.push("e.department = ?"); params.push(filters.department); }
    if (filters.search) {
      where.push("(u.full_name LIKE ? OR e.employee_code LIKE ? OR u.email LIKE ?)");
      const q = `%${filters.search}%`;
      params.push(q, q, q);
    }

    where.push(`(
      u.id IS NULL OR LOWER(COALESCE(r.role_name, '')) IN (
        'employee', 'staff', 'manager', 'technician',
        'nhan vien', 'nhân viên', 'quan ly', 'quản lý'
      )
    )`);
    if (where.length) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY e.employee_id DESC";

    const [rows] = await db.query(sql, params);
    return rows.map(fmt);
  },

  async findById(id) {
    await ensureEmployeeSchema();
    await ensureCanonicalRoles();
    const [[row]] = await db.query(
      `SELECT e.*, u.full_name, u.email, u.phone, u.sex, u.birthday AS dob, c.cinema_name
       FROM Employees e
       LEFT JOIN User u ON u.id = e.user_id
        LEFT JOIN Roles r ON r.role_id = u.role_id
       LEFT JOIN Cinemas c ON c.cinemas_id = e.cinema_id
       WHERE e.employee_id = ?`,
      [id],
    );
    return row ? fmt(row) : null;
  },

  async create(data) {
    await ensureEmployeeSchema();
    await ensureCanonicalRoles();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const userId = await resolveOrCreateUser(data, connection);
      const [result] = await connection.query(
        `INSERT INTO Employees
           (user_id, employee_code, position, department, type, hire_date, salary,
            status, shifts, address, sex, dob, avatar_url, citizen_id, id_card_front_url, id_card_back_url, cinema_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId || null,
          "",
          data.position     || "",
          data.department   || "",
          data.type         || "full_time",
          normalizeDateForDb(data.hireDate),
          Number(data.salary || 0),
          data.status       || "active",
          Array.isArray(data.shifts) ? data.shifts.join(",") : (data.shifts || ""),
          data.address      || "",
          data.sex          || "",
          normalizeDateForDb(data.dob),
          data.avatarUrl    || "",
          data.citizenId    || "",
          data.idCardFrontUrl || "",
          data.idCardBackUrl  || "",
          data.cinemaId     || null,
        ],
      );
      const generatedCode = `NV${String(result.insertId).padStart(5, "0")}`;
      await connection.query(
        "UPDATE Employees SET employee_code = ? WHERE employee_id = ?",
        [generatedCode, result.insertId],
      );
      await connection.commit();
      return result.insertId;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async update(id, data) {
    await ensureEmployeeSchema();
    await ensureCanonicalRoles();
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const fields = [];
      const params = [];
      const set = (col, val) => { fields.push(`${col} = ?`); params.push(val); };

      if (data.userId     !== undefined) set("user_id",       data.userId || null);
      if (data.code       !== undefined) set("employee_code", data.code);
      if (data.position   !== undefined) set("position",      data.position);
      if (data.department !== undefined) set("department",    data.department);
      if (data.type       !== undefined) set("type",          data.type);
      if (data.hireDate   !== undefined) set("hire_date",     normalizeDateForDb(data.hireDate));
      if (data.salary     !== undefined) set("salary",        Number(data.salary || 0));
      if (data.status     !== undefined) set("status",        data.status);
      if (data.shifts     !== undefined) set("shifts",        Array.isArray(data.shifts) ? data.shifts.join(",") : (data.shifts || ""));
      if (data.address    !== undefined) set("address",       data.address);
      if (data.sex        !== undefined) set("sex",           data.sex);
      if (data.dob        !== undefined) set("dob",           normalizeDateForDb(data.dob));
      if (data.avatarUrl  !== undefined) set("avatar_url",    data.avatarUrl);
      if (data.citizenId  !== undefined) set("citizen_id",    data.citizenId);
      if (data.idCardFrontUrl !== undefined) set("id_card_front_url", data.idCardFrontUrl);
      if (data.idCardBackUrl  !== undefined) set("id_card_back_url",  data.idCardBackUrl);
      if (data.cinemaId   !== undefined) set("cinema_id",     data.cinemaId || null);

      if (data.name !== undefined || data.email !== undefined || data.phone !== undefined || data.userId !== undefined) {
        const [[currentEmployee]] = await connection.query("SELECT user_id FROM Employees WHERE employee_id = ?", [id]);
        const resolvedUserId = await resolveOrCreateUser({ ...data, userId: data.userId ?? currentEmployee?.user_id }, connection);
        if (resolvedUserId !== null) {
          set("user_id", resolvedUserId);
        }
      }

      if (!fields.length) {
        await connection.rollback();
        return false;
      }
      params.push(id);
      const [result] = await connection.query(`UPDATE Employees SET ${fields.join(", ")} WHERE employee_id = ?`, params);
      await connection.commit();
      return result.affectedRows > 0;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async delete(id) {
    const [result] = await db.query("DELETE FROM Employees WHERE employee_id = ?", [id]);
    return result.affectedRows > 0;
  },

  async getStats() {
    await ensureEmployeeSchema();
    const [[stats]] = await db.query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'active')    AS active,
        SUM(status = 'inactive')  AS inactive,
        SUM(type   = 'full_time') AS full_time,
        SUM(type   = 'part_time') AS part_time
      FROM Employees
    `);
    return {
      total:     Number(stats.total    || 0),
      active:    Number(stats.active   || 0),
      inactive:  Number(stats.inactive || 0),
      fullTime:  Number(stats.full_time || 0),
      partTime:  Number(stats.part_time || 0),
    };
  },
};
