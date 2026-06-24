import { db } from "../../../config/db.js";

let ensurePromotionSchemaPromise;

const getRecipientUsers = async (connection = db) => {
  const [users] = await connection.query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.point,
      COALESCE(r.role_name, 'user') AS role_name
    FROM User u
    LEFT JOIN Roles r ON u.role_id = r.role_id
    WHERE u.status = 'active'
      AND (r.role_name IS NULL OR r.role_name NOT IN ('admin', 'staff'))
    ORDER BY u.full_name ASC, u.id ASC
  `,
  );

  return users;
};

export const ensurePromotionSchema = async () => {
  if (!ensurePromotionSchemaPromise) {
    ensurePromotionSchemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS Promotions (
          promotion_id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(100) NOT NULL UNIQUE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          promotion_type VARCHAR(20) DEFAULT 'coupon',
          discount_type VARCHAR(20) DEFAULT 'percent',
          discount_value DECIMAL(12,2) DEFAULT 0,
          min_order DECIMAL(12,2) DEFAULT 0,
          max_discount DECIMAL(12,2) DEFAULT 0,
          start_date DATE NULL,
          end_date DATE NULL,
          usage_limit INT DEFAULT 0,
          used_count INT DEFAULT 0,
          applicable_to VARCHAR(50) DEFAULT 'all',
          status VARCHAR(30) DEFAULT 'active',
          created_by INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NULL
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS User_Promotions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          promotion_id INT NOT NULL,
          user_id INT NOT NULL,
          status VARCHAR(30) DEFAULT 'active',
          issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used_at DATETIME NULL,
          UNIQUE KEY uniq_user_promotion (promotion_id, user_id),
          FOREIGN KEY (promotion_id) REFERENCES Promotions(promotion_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        )
      `);
    })();
  }

  return ensurePromotionSchemaPromise;
};

const mapPromotionPayload = (payload = {}, type = "coupon") => ({
  code: String(payload.code || "").trim().toUpperCase(),
  title: String(
    payload.title ||
      (type === "voucher"
        ? `Voucher ${payload.code || ""}`.trim()
        : `Khuyen mai ${payload.code || ""}`.trim()),
  ),
  description: String(payload.desc || payload.description || "").trim(),
  promotionType: type,
  discountType: payload.type || payload.discountType || "percent",
  discountValue: Number(payload.value || payload.discountValue || 0),
  minOrder: Number(payload.minOrder || payload.min_order || 0),
  maxDiscount: Number(payload.maxDiscount || payload.max_discount || 0),
  startDate: payload.startDate || payload.start_date || payload.issuedDate || null,
  endDate: payload.endDate || payload.end_date || payload.expiryDate || null,
  usageLimit: Number(payload.usageLimit || payload.usage_limit || 0),
  usedCount: Number(payload.usedCount || payload.used_count || 0),
  applicableTo: payload.applicableTo || payload.applicable_to || "all",
  status: payload.status || "active",
  createdBy: payload.createdBy || null,
});

const formatCouponRow = (row) => ({
  id: row.promotion_id,
  code: row.code,
  title: row.title,
  type: row.discount_type,
  value: Number(row.discount_value || 0),
  minOrder: Number(row.min_order || 0),
  maxDiscount: Number(row.max_discount || 0),
  startDate: row.start_date ? String(row.start_date).slice(0, 10) : "",
  endDate: row.end_date ? String(row.end_date).slice(0, 10) : "",
  usageLimit: Number(row.usage_limit || 0),
  usedCount: Number(row.used_count || 0),
  applicableTo: row.applicable_to || "all",
  status: row.status || "inactive",
  desc: row.description || "",
});

const formatVoucherRow = (row) => ({
  id: row.promotion_id,
  code: row.code,
  title: row.title,
  type: row.discount_type,
  value: Number(row.discount_value || 0),
  minOrder: Number(row.min_order || 0),
  maxDiscount: Number(row.max_discount || 0),
  userId: row.user_id,
  issuedTo: row.full_name || "",
  issuedDate: row.issued_at ? String(row.issued_at).slice(0, 10) : "",
  expiryDate: row.end_date ? String(row.end_date).slice(0, 10) : "",
  status: row.assignment_status || row.status || "active",
  usedDate: row.used_at ? String(row.used_at).slice(0, 10) : null,
  desc: row.description || "",
});

export const PromotionModel = {
  async getRecipientUsers() {
    await ensurePromotionSchema();
    return getRecipientUsers();
  },

  async findCoupons() {
    await ensurePromotionSchema();
    const [rows] = await db.query(
      `
      SELECT *
      FROM Promotions
      WHERE promotion_type = 'coupon'
      ORDER BY created_at DESC, promotion_id DESC
    `,
    );
    return rows.map(formatCouponRow);
  },

  async findVouchers() {
    await ensurePromotionSchema();
    const [rows] = await db.query(
      `
      SELECT
        p.*,
        up.user_id,
        up.status AS assignment_status,
        up.issued_at,
        up.used_at,
        u.full_name
      FROM Promotions p
      LEFT JOIN User_Promotions up ON up.promotion_id = p.promotion_id
      LEFT JOIN User u ON u.id = up.user_id
      WHERE p.promotion_type = 'voucher'
      ORDER BY p.created_at DESC, p.promotion_id DESC
    `,
    );
    return rows.map(formatVoucherRow);
  },

  async createCoupon(payload) {
    await ensurePromotionSchema();
    const data = mapPromotionPayload(payload, "coupon");
    const [result] = await db.query(
      `
      INSERT INTO Promotions (
        code, title, description, promotion_type, discount_type, discount_value,
        min_order, max_discount, start_date, end_date, usage_limit, used_count,
        applicable_to, status, created_by, updated_at
      )
      VALUES (?, ?, ?, 'coupon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
      [
        data.code,
        data.title,
        data.description,
        data.discountType,
        data.discountValue,
        data.minOrder,
        data.maxDiscount,
        data.startDate,
        data.endDate,
        data.usageLimit,
        data.usedCount,
        data.applicableTo,
        data.status,
        data.createdBy,
      ],
    );
    return result.insertId;
  },

  async updateCoupon(id, payload) {
    await ensurePromotionSchema();
    const data = mapPromotionPayload(payload, "coupon");
    const [result] = await db.query(
      `
      UPDATE Promotions
      SET
        code = ?,
        title = ?,
        description = ?,
        discount_type = ?,
        discount_value = ?,
        min_order = ?,
        max_discount = ?,
        start_date = ?,
        end_date = ?,
        usage_limit = ?,
        used_count = ?,
        applicable_to = ?,
        status = ?,
        updated_at = NOW()
      WHERE promotion_id = ? AND promotion_type = 'coupon'
    `,
      [
        data.code,
        data.title,
        data.description,
        data.discountType,
        data.discountValue,
        data.minOrder,
        data.maxDiscount,
        data.startDate,
        data.endDate,
        data.usageLimit,
        data.usedCount,
        data.applicableTo,
        data.status,
        id,
      ],
    );
    return result.affectedRows > 0;
  },

  async createVoucher(payload) {
    await ensurePromotionSchema();
    const data = mapPromotionPayload(payload, "voucher");
    const userId = Number(payload.userId || payload.user_id || 0);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [promotionResult] = await connection.query(
        `
        INSERT INTO Promotions (
          code, title, description, promotion_type, discount_type, discount_value,
          min_order, max_discount, start_date, end_date, usage_limit, used_count,
          applicable_to, status, created_by, updated_at
        )
        VALUES (?, ?, ?, 'voucher', ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, NOW())
      `,
        [
          data.code,
          data.title,
          data.description,
          data.discountType,
          data.discountValue,
          data.minOrder,
          data.maxDiscount,
          data.startDate,
          data.endDate,
          data.applicableTo,
          data.status,
          data.createdBy,
        ],
      );

      await connection.query(
        `
        INSERT INTO User_Promotions (promotion_id, user_id, status, issued_at, used_at)
        VALUES (?, ?, ?, NOW(), NULL)
      `,
        [promotionResult.insertId, userId, data.status],
      );

      await connection.commit();
      return promotionResult.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateVoucher(id, payload) {
    await ensurePromotionSchema();
    const data = mapPromotionPayload(payload, "voucher");
    const userId = Number(payload.userId || payload.user_id || 0);
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `
        UPDATE Promotions
        SET
          code = ?,
          title = ?,
          description = ?,
          discount_type = ?,
          discount_value = ?,
          min_order = ?,
          max_discount = ?,
          start_date = ?,
          end_date = ?,
          applicable_to = ?,
          status = ?,
          updated_at = NOW()
        WHERE promotion_id = ? AND promotion_type = 'voucher'
      `,
        [
          data.code,
          data.title,
          data.description,
          data.discountType,
          data.discountValue,
          data.minOrder,
          data.maxDiscount,
          data.startDate,
          data.endDate,
          data.applicableTo,
          data.status,
          id,
        ],
      );

      await connection.query("DELETE FROM User_Promotions WHERE promotion_id = ?", [
        id,
      ]);
      await connection.query(
        `
        INSERT INTO User_Promotions (promotion_id, user_id, status, issued_at, used_at)
        VALUES (?, ?, ?, NOW(), NULL)
      `,
        [id, userId, data.status],
      );

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deletePromotion(id) {
    await ensurePromotionSchema();
    const [result] = await db.query(
      "DELETE FROM Promotions WHERE promotion_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  async findUserPromotions(userId) {
    await ensurePromotionSchema();

    const [coupons] = await db.query(
      `
      SELECT *
      FROM Promotions
      WHERE promotion_type = 'coupon'
        AND status = 'active'
        AND (start_date IS NULL OR start_date <= CURDATE())
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY created_at DESC, promotion_id DESC
    `,
    );

    const [vouchers] = await db.query(
      `
      SELECT
        p.*,
        up.status AS assignment_status,
        up.issued_at,
        up.used_at
      FROM User_Promotions up
      JOIN Promotions p ON p.promotion_id = up.promotion_id
      WHERE up.user_id = ?
        AND p.promotion_type = 'voucher'
      ORDER BY up.issued_at DESC, p.promotion_id DESC
    `,
      [userId],
    );

    return {
      coupons: coupons.map(formatCouponRow),
      vouchers: vouchers.map(formatVoucherRow),
    };
  },
};
