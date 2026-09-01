import { db } from "../../../config/db.js";

const normalizeRoleKey = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) return "";

  if (["user", "customer", "khach hang", "khachhang", "khách hàng", "kháchhang"].includes(normalized)) {
    return "user";
  }

  if (["admin"].includes(normalized)) {
    return "admin";
  }

  if (["employee", "staff", "nhan vien", "nhân viên", "manager", "technician", "quan ly", "quản lý"].includes(normalized)) {
    return "employee";
  }

  return normalized;
};

const resolveRoleDisplayText = (roleName = "") => {
  const normalized = normalizeRoleKey(roleName);

  if (normalized === "user") return "Khách hàng";
  if (normalized === "employee") return "Nhân viên";
  if (normalized === "admin") return "Quản trị viên";

  return String(roleName || "Khách hàng").trim() || "Khách hàng";
};

export const UserModel = {
  async findRoleSummary() {
    const [roles] = await db.query(
      `SELECT
         LOWER(COALESCE(r.role_name, '')) AS raw_role_name,
         COALESCE(r.description, r.role_name, 'Khách hàng') AS raw_description,
         COUNT(u.id) AS total_users
       FROM Roles r
       LEFT JOIN User u ON u.role_id = r.role_id
       GROUP BY LOWER(COALESCE(r.role_name, '')), COALESCE(r.description, r.role_name, 'Khách hàng')
       ORDER BY CASE
         WHEN raw_role_name IN ('user', 'customer', 'khach hang', 'khachhang', 'khách hàng', 'kháchhang') THEN 1
         WHEN raw_role_name IN ('employee', 'staff', 'nhan vien', 'nhân viên', 'manager', 'technician', 'quan ly', 'quản lý') THEN 2
         WHEN raw_role_name = 'admin' THEN 3
         ELSE 4
       END, raw_role_name`,
    );

    const groupedMap = new Map();

    for (const role of roles) {
      const normalized = normalizeRoleKey(role.raw_role_name);
      if (!normalized) continue;

      const existing = groupedMap.get(normalized) || {
        name: normalized,
        description: resolveRoleDisplayText(role.raw_role_name),
        totalUsers: 0,
      };

      existing.totalUsers += Number(role.total_users || 0);
      existing.description = resolveRoleDisplayText(role.raw_role_name);
      groupedMap.set(normalized, existing);
    }

    return [...groupedMap.entries()].map(([name, role], index) => ({
      id: index + 1,
      name,
      description: role.description,
      totalUsers: Number(role.totalUsers || 0),
    }));
  },

  /**
   * Lấy tất cả người dùng trong hệ thống để hiển thị ở trang quản lý khách hàng.
   * @returns {Promise<Array>} Danh sách người dùng.
   */
  async findAdminUsers() {
    const [users] = await db.query(
      `SELECT
        u.id as user_id,
        u.full_name,
        u.user_name,
        u.email,
        u.phone as phone_number,
        u.avatar,
        CASE
          WHEN u.id = 1 THEN 'admin'
          WHEN LOWER(COALESCE(e.position, '')) LIKE '%quản lý%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%manager%'
            OR LOWER(COALESCE(r.role_name, '')) IN ('manager', 'quan ly', 'quản lý') THEN 'manager'
          WHEN LOWER(COALESCE(e.position, '')) LIKE '%kỹ thuật%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%technician%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%technical%'
            OR LOWER(COALESCE(r.role_name, '')) IN ('technician', 'technical') THEN 'technician'
          WHEN e.employee_id IS NOT NULL
            OR LOWER(COALESCE(r.role_name, '')) IN ('employee', 'staff', 'nhan vien', 'nhân viên') THEN 'staff'
          ELSE 'user'
        END as role,
        e.position as employee_position,
        u.status,
        u.email_verified,
        u.birthday,
        u.sex,
        u.point as points,
        u.created_at
      FROM
        User u
      LEFT JOIN
        Roles r ON u.role_id = r.role_id
      LEFT JOIN
        Employees e ON e.user_id = u.id
      ORDER BY
        u.created_at DESC, u.id DESC`,
    );
    return users;
  },

  /**
   * Cập nhật trạng thái của một người dùng (ví dụ: 'active', 'inactive').
   * @param {number} userId - ID của người dùng.
   * @param {string} status - Trạng thái mới.
   * @returns {Promise<boolean>} Trả về true nếu cập nhật thành công.
   */
  async updateUserStatus(userId, status) {
    const [result] = await db.query("UPDATE User SET status = ? WHERE id = ?", [
      status,
      userId,
    ]);
    return result.affectedRows > 0;
  },
};
