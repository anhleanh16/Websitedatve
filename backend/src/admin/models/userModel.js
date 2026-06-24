import { db } from "../../../config/db.js";

export const UserModel = {
  /**
   * Lấy tất cả người dùng trong hệ thống để hiển thị ở trang quản lý khách hàng.
   * @returns {Promise<Array>} Danh sách người dùng.
   */
  async findAdminUsers() {
    const [users] = await db.query(
      `SELECT
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone as phone_number,
        COALESCE(r.role_name, 'user') as role,
        u.status,
        u.birthday,
        u.sex,
        u.point as points,
        u.created_at
      FROM
        User u
      LEFT JOIN
        Roles r ON u.role_id = r.role_id
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
