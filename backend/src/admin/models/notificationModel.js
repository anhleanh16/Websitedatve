import { db } from "../../../config/db.js";

let ensureNotificationSchemaPromise;

const ensureColumn = async (tableName, columnName, definitionSql) => {
  const [rows] = await db.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [
    columnName,
  ]);

  if (rows.length === 0) {
    await db.query(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`,
    );
  }
};

const ensureIndex = async (tableName, indexName, createSql) => {
  const [rows] = await db.query(
    `
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
  `,
    [tableName, indexName],
  );

  if (rows.length === 0) {
    await db.query(createSql);
  }
};

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

export const ensureNotificationSchema = async () => {
  if (!ensureNotificationSchemaPromise) {
    ensureNotificationSchemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS Notifications (
          notification_id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255),
          content TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS User_Notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          notification_id INT,
          is_read BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
          FOREIGN KEY (notification_id) REFERENCES Notifications(notification_id) ON DELETE CASCADE
        )
      `);

      await ensureColumn("Notifications", "type", "VARCHAR(50) DEFAULT 'system'");
      await ensureColumn(
        "Notifications",
        "audience_scope",
        "VARCHAR(20) DEFAULT 'all'",
      );
      await ensureColumn("Notifications", "created_by", "INT NULL");
      await ensureColumn("Notifications", "reference_key", "VARCHAR(150) NULL");
      await ensureIndex(
        "Notifications",
        "uniq_notifications_reference_key",
        "CREATE UNIQUE INDEX uniq_notifications_reference_key ON Notifications (reference_key)",
      );
    })();
  }

  return ensureNotificationSchemaPromise;
};

export const NotificationModel = {
  async createForUser({
    userId,
    title,
    content,
    type = "booking",
    createdBy = null,
    dedupeKey = null,
  }) {
    await ensureNotificationSchema();

    const normalizedUserId = Number(userId || 0);
    const normalizedDedupeKey = String(dedupeKey || "").trim().slice(0, 150);
    if (!normalizedUserId) {
      throw new Error("Invalid userId for notification.");
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      if (normalizedDedupeKey) {
        const [[existing]] = await connection.query(
          `
          SELECT n.notification_id
          FROM Notifications n
          JOIN User_Notifications un ON un.notification_id = n.notification_id
          WHERE un.user_id = ? AND n.reference_key = ?
          LIMIT 1
        `,
          [normalizedUserId, normalizedDedupeKey],
        );

        if (existing?.notification_id) {
          await connection.commit();
          return {
            notificationId: existing.notification_id,
            userId: normalizedUserId,
            duplicated: true,
          };
        }
      }

      const [result] = await connection.query(
        `
        INSERT INTO Notifications (title, content, type, audience_scope, created_by, reference_key)
        VALUES (?, ?, ?, 'single', ?, ?)
      `,
        [title, content, type, createdBy, normalizedDedupeKey || null],
      );

      await connection.query(
        `
        INSERT INTO User_Notifications (user_id, notification_id, is_read)
        VALUES (?, ?, 0)
      `,
        [normalizedUserId, result.insertId],
      );

      await connection.commit();
      return {
        notificationId: result.insertId,
        userId: normalizedUserId,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getRecipientUsers() {
    await ensureNotificationSchema();
    return getRecipientUsers();
  },

  async findAllForAdmin() {
    await ensureNotificationSchema();

    const [rows] = await db.query(
      `
      SELECT
        n.notification_id,
        n.title,
        n.content,
        n.type,
        n.audience_scope,
        n.created_at,
        COUNT(unf.id) AS recipient_count,
        COALESCE(SUM(CASE WHEN unf.is_read = 1 THEN 1 ELSE 0 END), 0) AS read_count
      FROM Notifications n
      LEFT JOIN User_Notifications unf
        ON unf.notification_id = n.notification_id
      GROUP BY
        n.notification_id,
        n.title,
        n.content,
        n.type,
        n.audience_scope,
        n.created_at
      ORDER BY n.created_at DESC, n.notification_id DESC
    `,
    );

    return rows;
  },

  async findByIdForAdmin(notificationId) {
    await ensureNotificationSchema();
    const [[row]] = await db.query(
      `
      SELECT
        n.notification_id,
        n.title,
        n.content,
        n.type,
        n.audience_scope,
        n.created_at,
        COUNT(unf.id) AS recipient_count,
        COALESCE(SUM(CASE WHEN unf.is_read = 1 THEN 1 ELSE 0 END), 0) AS read_count
      FROM Notifications n
      LEFT JOIN User_Notifications unf
        ON unf.notification_id = n.notification_id
      WHERE n.notification_id = ?
      GROUP BY
        n.notification_id,
        n.title,
        n.content,
        n.type,
        n.audience_scope,
        n.created_at
      LIMIT 1
    `,
      [notificationId],
    );

    return row || null;
  },

  async findRecipientsByNotificationId(notificationId) {
    await ensureNotificationSchema();
    const [rows] = await db.query(
      `
      SELECT
        unf.id,
        unf.user_id,
        unf.is_read,
        u.full_name,
        u.email
      FROM User_Notifications unf
      JOIN User u ON u.id = unf.user_id
      WHERE unf.notification_id = ?
      ORDER BY unf.is_read ASC, u.full_name ASC, u.id ASC
    `,
      [notificationId],
    );

    return rows;
  },

  async createAndSend({
    title,
    content,
    type = "system",
    audienceScope = "all",
    recipientIds = [],
    createdBy = null,
  }) {
    await ensureNotificationSchema();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `
        INSERT INTO Notifications (title, content, type, audience_scope, created_by)
        VALUES (?, ?, ?, ?, ?)
      `,
        [title, content, type, audienceScope, createdBy],
      );

      const notificationId = result.insertId;
      const recipients =
        audienceScope === "all"
          ? await getRecipientUsers(connection)
          : await getRecipientUsers(connection).then((users) =>
              users.filter((user) =>
                recipientIds.map(Number).includes(Number(user.id)),
              ),
            );

      for (const user of recipients) {
        await connection.query(
          `
          INSERT INTO User_Notifications (user_id, notification_id, is_read)
          VALUES (?, ?, 0)
        `,
          [user.id, notificationId],
        );
      }

      await connection.commit();

      return {
        notificationId,
        recipientCount: recipients.length,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateForAdmin(notificationId, { title, content, type }) {
    await ensureNotificationSchema();
    const [result] = await db.query(
      `
      UPDATE Notifications
      SET title = ?, content = ?, type = ?
      WHERE notification_id = ?
    `,
      [title, content, type, notificationId],
    );

    return result.affectedRows > 0;
  },

  async deleteForAdmin(notificationId) {
    await ensureNotificationSchema();
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query(
        "DELETE FROM User_Notifications WHERE notification_id = ?",
        [notificationId],
      );
      const [result] = await connection.query(
        "DELETE FROM Notifications WHERE notification_id = ?",
        [notificationId],
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

  async findByUserId(userId) {
    await ensureNotificationSchema();
    const [rows] = await db.query(
      `
      SELECT
        unf.id,
        unf.is_read,
        n.notification_id,
        n.title,
        n.content,
        n.type,
        n.created_at
      FROM User_Notifications unf
      JOIN Notifications n ON n.notification_id = unf.notification_id
      WHERE unf.user_id = ?
      ORDER BY n.created_at DESC, unf.id DESC
    `,
      [userId],
    );

    return rows;
  },

  async markAsRead(userId, notificationId) {
    await ensureNotificationSchema();
    const [result] = await db.query(
      `
      UPDATE User_Notifications
      SET is_read = 1
      WHERE user_id = ? AND notification_id = ?
    `,
      [userId, notificationId],
    );

    return result.affectedRows > 0;
  },

  async markAllAsRead(userId) {
    await ensureNotificationSchema();
    const [result] = await db.query(
      `
      UPDATE User_Notifications
      SET is_read = 1
      WHERE user_id = ? AND is_read = 0
    `,
      [userId],
    );

    return result.affectedRows || 0;
  },

  async deleteForUser(userId, notificationId) {
    await ensureNotificationSchema();
    const [result] = await db.query(
      `
      DELETE FROM User_Notifications
      WHERE user_id = ? AND notification_id = ?
    `,
      [userId, notificationId],
    );

    return result.affectedRows > 0;
  },

  async clearForUser(userId) {
    await ensureNotificationSchema();
    const [result] = await db.query(
      "DELETE FROM User_Notifications WHERE user_id = ?",
      [userId],
    );

    return result.affectedRows || 0;
  },
};
