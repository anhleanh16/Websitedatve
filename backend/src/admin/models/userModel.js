import { db } from "../../../config/db.js";

export const UserModel = {
  /**
   * Lấy tất cả người dùng có vai trò 'admin' hoặc 'staff'.
   * @returns {Promise<Array>} Danh sách người dùng.
   */
  async findAdminUsers() {
    const [users] = await db.query(
      `SELECT
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone as phone_number,
        r.role_name as role,
        u.status,
        u.created_at
      FROM
        User u
      JOIN
        Roles r ON u.role_id = r.role_id
      WHERE
        r.role_name IN ('admin', 'staff')`,
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
