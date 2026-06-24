import { db } from "../../../config/db.js";

export const CategoryModel = {
  /**
   * Lấy tất cả các danh mục.
   * @returns {Promise<Array>} Danh sách các danh mục.
   */
  async findAll() {
    const [categories] = await db.query(
      `
      SELECT
        mc.category_id,
        mc.category_name,
        COUNT(DISTINCT CASE WHEN m.movie_id IS NOT NULL THEN m.movie_id END) AS movieCount
      FROM Movie_Categories mc
      LEFT JOIN Movie_Category_Detail mcd ON mc.category_id = mcd.category_id
      LEFT JOIN Movies m ON mcd.movie_id = m.movie_id AND (m.is_deleted = 0 OR m.is_deleted IS NULL)
      GROUP BY mc.category_id, mc.category_name
      ORDER BY mc.category_name
      `,
    );
    return categories;
  },

  /**
   * Tìm một danh mục bằng ID.
   * @param {number} id - ID của danh mục.
   * @returns {Promise<Object|null>} Đối tượng danh mục hoặc null nếu không tìm thấy.
   */
  async findById(id) {
    const [rows] = await db.query(
      "SELECT * FROM Movie_Categories WHERE category_id = ?",
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Tạo một danh mục mới.
   * @param {Object} categoryData - Dữ liệu của danh mục (chứa category_name).
   * @returns {Promise<number>} ID của danh mục vừa được tạo.
   */
  async create(categoryData) {
    const { category_name } = categoryData;
    const [result] = await db.query(
      "INSERT INTO Movie_Categories (category_name) VALUES (?)",
      [category_name],
    );
    return result.insertId;
  },

  /**
   * Cập nhật một danh mục.
   * @param {number} id - ID của danh mục cần cập nhật.
   * @param {Object} categoryData - Dữ liệu mới của danh mục.
   * @returns {Promise<boolean>} True nếu cập nhật thành công.
   */
  async update(id, categoryData) {
    const { category_name } = categoryData;
    const [result] = await db.query(
      "UPDATE Movie_Categories SET category_name = ? WHERE category_id = ?",
      [category_name, id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Xóa một danh mục.
   * @param {number} id - ID của danh mục cần xóa.
   * @returns {Promise<boolean>} True nếu xóa thành công.
   */
  async delete(id) {
    // Lưu ý: Cần cân nhắc xử lý các phim đang thuộc danh mục này trước khi xóa.
    // Ví dụ: không cho xóa nếu có phim đang sử dụng, hoặc gán phim sang danh mục "Chưa phân loại".
    // Tạm thời, chúng ta sẽ thực hiện xóa trực tiếp.
    const [result] = await db.query(
      "DELETE FROM Movie_Categories WHERE category_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};
