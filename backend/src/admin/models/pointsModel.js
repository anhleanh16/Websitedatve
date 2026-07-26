import { db } from '../../../config/db.js';

let ensurePointsSchemaPromise;

const ensurePointsSchema = async () => {
  if (!ensurePointsSchemaPromise) {
    ensurePointsSchemaPromise = (async () => {
      const addColumnIfMissing = async (tableName, columnDefinition, afterClause = '') => {
        const [columns] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
        const columnNames = new Set(columns.map((column) => column.Field));
        if (!columnNames.has(columnDefinition.name)) {
          const after = afterClause ? ` AFTER ${afterClause}` : '';
          await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition.definition}${after}`);
        }
      };

      await db.query(`
        CREATE TABLE IF NOT EXISTS Membership_Levels (
          level_id INT AUTO_INCREMENT PRIMARY KEY,
          level_name VARCHAR(50) NOT NULL,
          min_points INT DEFAULT 0,
          max_points INT DEFAULT 0,
          benefits TEXT,
          discount_percent INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS Point_Rules (
          rule_id INT AUTO_INCREMENT PRIMARY KEY,
          rule_name VARCHAR(100) NOT NULL,
          rule_scope VARCHAR(20) NOT NULL DEFAULT 'order',
          rule_key VARCHAR(100) NOT NULL DEFAULT '',
          spending_amount DECIMAL(12,2) DEFAULT 0,
          earned_points INT DEFAULT 0,
          points_value INT DEFAULT 0,
          status BOOLEAN DEFAULT TRUE,
          expires_in_months INT DEFAULT 12
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS Reward_Rules (
          reward_id INT AUTO_INCREMENT PRIMARY KEY,
          reward_name VARCHAR(100) NOT NULL,
          required_points INT DEFAULT 0,
          reward_type VARCHAR(50) DEFAULT 'voucher',
          reward_value VARCHAR(100) DEFAULT '',
          status BOOLEAN DEFAULT TRUE
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS Point_History (
          history_id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          points_change INT DEFAULT 0,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NULL,
          FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
        )
      `);

      await addColumnIfMissing('Point_Rules', { name: 'rule_scope', definition: 'rule_scope VARCHAR(20) NOT NULL DEFAULT \"order\"' });
      await addColumnIfMissing('Point_Rules', { name: 'rule_key', definition: 'rule_key VARCHAR(100) NOT NULL DEFAULT \"\"' });
      await addColumnIfMissing('Point_Rules', { name: 'points_value', definition: 'points_value INT DEFAULT 0' });
      await addColumnIfMissing('Point_Rules', { name: 'expires_in_months', definition: 'expires_in_months INT DEFAULT 12' });
      await addColumnIfMissing('Point_History', { name: 'expires_at', definition: 'expires_at TIMESTAMP NULL' });

      const [levelRows] = await db.query(`SELECT COUNT(*) AS count FROM Membership_Levels`);
      if (!Number(levelRows[0].count || 0)) {
        await db.query(`
          INSERT INTO Membership_Levels (level_name, min_points, max_points, benefits, discount_percent)
          VALUES
            ('Silver', 0, 499, 'Ưu đãi cơ bản cho khách hàng mới', 0),
            ('Gold', 500, 1499, 'Giảm giá combo và ưu tiên đặt vé', 5),
            ('Platinum', 1500, 2999, 'Nhân đôi điểm vào thứ 3 và ưu đãi đặc biệt', 10),
            ('Diamond', 3000, 999999, 'Quyền lợi VIP, ưu tiên cao và quà sinh nhật', 15)
        `);
      }

      const [ruleRows] = await db.query(`SELECT COUNT(*) AS count FROM Point_Rules`);
      if (!Number(ruleRows[0].count || 0)) {
        await db.query(`
          INSERT INTO Point_Rules (rule_name, rule_scope, rule_key, spending_amount, earned_points, points_value, status, expires_in_months)
          VALUES
            ('Tích điểm theo tổng đơn', 'order', '', 10000, 1, 0, TRUE, 12),
            ('Ghế thường', 'seat', 'regular', 0, 0, 8, TRUE, 12),
            ('Ghế VIP', 'seat', 'vip', 0, 0, 12, TRUE, 12),
            ('Ghế đôi', 'seat', 'couple', 0, 0, 16, TRUE, 12)
        `);
      }

      const [rewardRows] = await db.query(`SELECT COUNT(*) AS count FROM Reward_Rules`);
      if (!Number(rewardRows[0].count || 0)) {
        await db.query(`
          INSERT INTO Reward_Rules (reward_name, required_points, reward_type, reward_value, status)
          VALUES
            ('Voucher giảm 20.000đ', 200, 'voucher', 'GIAM20K', TRUE),
            ('Combo bắp nước miễn phí', 350, 'coupon', 'COMBOFREE', TRUE),
            ('Vé xem phim 2D miễn phí', 500, 'gift', 'TICKET2D', TRUE)
        `);
      }
    })();
  }

  return ensurePointsSchemaPromise;
};

const normalizeStatus = (value) => {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value > 0 ? 1 : 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'active', 'enabled', 'show'].includes(normalized)) return 1;
    if (['false', '0', 'inactive', 'disabled', 'hidden'].includes(normalized)) return 0;
  }
  return 1;
};

const formatLevel = (row) => ({
  id: row.level_id,
  levelName: row.level_name,
  minPoints: Number(row.min_points || 0),
  maxPoints: Number(row.max_points || 0),
  benefits: row.benefits || '',
  discountPercent: Number(row.discount_percent || 0),
  createdAt: row.created_at,
});

const formatRule = (row) => ({
  id: row.rule_id,
  ruleName: row.rule_name,
  ruleScope: row.rule_scope || 'order',
  ruleKey: row.rule_key || '',
  spendingAmount: Number(row.spending_amount || 0),
  earnedPoints: Number(row.earned_points || 0),
  pointsValue: Number(row.points_value || 0),
  status: Boolean(Number(row.status || 0)),
  expiresInMonths: Number(row.expires_in_months || 12),
});

const formatReward = (row) => ({
  id: row.reward_id,
  rewardName: row.reward_name,
  requiredPoints: Number(row.required_points || 0),
  rewardType: row.reward_type || 'voucher',
  rewardValue: row.reward_value || '',
  status: Boolean(Number(row.status || 0)),
});

const formatHistory = (row) => ({
  id: row.history_id,
  points: Number(row.points_change || 0),
  description: row.description || '',
  createdAt: row.created_at,
});

const normalizeRuleScope = (value) => {
  const normalized = String(value || 'order').trim().toLowerCase();
  if (['seat', 'combo', 'order'].includes(normalized)) return normalized;
  return 'order';
};

const normalizeRuleKey = (value) => String(value || '').trim().toLowerCase();

const getCurrentBalance = async (userId, connection = db) => {
  const [historyRows] = await connection.query(`
    SELECT points_change, expires_at
    FROM Point_History
    WHERE user_id = ?
  `, [userId]);

  const activePoints = historyRows.reduce((sum, row) => {
    const change = Number(row.points_change || 0);
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (change > 0 && expiresAt && expiresAt <= new Date()) {
      return sum;
    }
    return sum + (change > 0 ? change : 0);
  }, 0);

  const spentPoints = historyRows.reduce((sum, row) => {
    const change = Number(row.points_change || 0);
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (change < 0 && expiresAt && expiresAt <= new Date()) {
      return sum;
    }
    return sum + (change < 0 ? Math.abs(change) : 0);
  }, 0);

  return Math.max(0, activePoints - spentPoints);
};

const expireUserPoints = async (userId, connection = db) => {
  const [rows] = await connection.query(`
    SELECT history_id, points_change, description, created_at
    FROM Point_History
    WHERE user_id = ? AND points_change > 0 AND expires_at IS NOT NULL AND expires_at <= NOW()
  `, [userId]);

  if (!rows.length) {
    return 0;
  }

  const expiredPoints = rows.reduce((sum, row) => sum + Number(row.points_change || 0), 0);
  const expiredIds = rows.map((row) => row.history_id);
  await connection.query(`
    UPDATE Point_History
    SET points_change = 0,
        description = CONCAT(description, ' [expired]')
    WHERE history_id IN (${expiredIds.map(() => '?').join(', ')})
  `, expiredIds);

  const currentBalance = await getCurrentBalance(userId, connection);
  await connection.query(`UPDATE User SET point = ? WHERE id = ?`, [currentBalance, userId]);

  return expiredPoints;
};

const getTierForPoints = (points, levels) => {
  const safePoints = Number(points || 0);
  const current = levels
    .filter((level) => safePoints >= Number(level.minPoints || 0))
    .sort((a, b) => Number(b.minPoints || 0) - Number(a.minPoints || 0))[0];

  if (!current) return null;
  return {
    id: current.id,
    name: current.levelName,
    min: Number(current.minPoints || 0),
    max: Number(current.maxPoints || 0),
    discount: Number(current.discountPercent || 0),
  };
};

export const PointsModel = {
  async ensureSchema() {
    await ensurePointsSchema();
  },

  async getAdminUsersSummary() {
    await ensurePointsSchema();
    const [rows] = await db.query(`
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.point AS points,
        u.status,
        u.created_at,
        COALESCE(SUM(CASE WHEN ph.points_change > 0 THEN ph.points_change ELSE 0 END), 0) AS earned_points,
        COALESCE(SUM(CASE WHEN ph.points_change < 0 THEN ABS(ph.points_change) ELSE 0 END), 0) AS spent_points,
        MAX(ph.created_at) AS last_activity
      FROM User u
      LEFT JOIN Point_History ph ON ph.user_id = u.id
      GROUP BY u.id, u.full_name, u.email, u.point, u.status, u.created_at
      ORDER BY u.point DESC, u.created_at DESC
    `);

    return rows.map((row) => ({
      id: row.user_id,
      fullName: row.full_name,
      email: row.email,
      points: Number(row.points || 0),
      status: row.status,
      createdAt: row.created_at,
      earnedPoints: Number(row.earned_points || 0),
      spentPoints: Number(row.spent_points || 0),
      lastActivity: row.last_activity,
    }));
  },

  async getUserPointSummary(userId) {
    await ensurePointsSchema();
    const [users] = await db.query(`
      SELECT id, full_name, email, point, status
      FROM User
      WHERE id = ?
    `, [userId]);

    if (!users.length) {
      return null;
    }

    const user = users[0];
    await expireUserPoints(userId);

    const [historyRows] = await db.query(`
      SELECT history_id, points_change, description, created_at, expires_at
      FROM Point_History
      WHERE user_id = ?
      ORDER BY created_at DESC, history_id DESC
      LIMIT 20
    `, [userId]);

    const [levelRows] = await db.query(`
      SELECT level_id, level_name, min_points, max_points, benefits, discount_percent, created_at
      FROM Membership_Levels
      ORDER BY min_points ASC, level_id ASC
    `);

    const [ruleRows] = await db.query(`
      SELECT rule_id, rule_name, rule_scope, rule_key, spending_amount, earned_points, points_value, status, expires_in_months
      FROM Point_Rules
      WHERE status = TRUE
      ORDER BY spending_amount ASC, rule_id ASC
    `);

    const [rewardRows] = await db.query(`
      SELECT reward_id, reward_name, required_points, reward_type, reward_value, status
      FROM Reward_Rules
      WHERE status = TRUE
      ORDER BY required_points ASC, reward_id ASC
    `);

    const levels = levelRows.map(formatLevel);
    const computedPoints = await getCurrentBalance(userId);
    const tier = getTierForPoints(computedPoints, levels);

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        points: computedPoints,
        status: user.status,
        tier,
      },
      history: historyRows.map(formatHistory),
      levels,
      rules: ruleRows.map(formatRule),
      rewards: rewardRows.map(formatReward),
    };
  },

  async adjustUserPoints(userId, delta, description) {
    await ensurePointsSchema();
    const parsedUserId = Number(userId);
    const parsedDelta = Number(delta || 0);

    if (!parsedUserId) {
      throw new Error('Thiếu thông tin người dùng.');
    }

    if (!Number.isFinite(parsedDelta)) {
      throw new Error('Số điểm không hợp lệ.');
    }

    const [users] = await db.query(`SELECT id, point FROM User WHERE id = ?`, [parsedUserId]);
    if (!users.length) {
      throw new Error('Không tìm thấy người dùng.');
    }

    const currentPoints = await getCurrentBalance(parsedUserId);
    const nextPoints = currentPoints + parsedDelta;
    if (nextPoints < 0) {
      throw new Error('Số điểm sau khi điều chỉnh không được âm.');
    }

    await db.query(`UPDATE User SET point = ? WHERE id = ?`, [nextPoints, parsedUserId]);
    await db.query(`
      INSERT INTO Point_History (user_id, points_change, description, expires_at)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 MONTH))
    `, [parsedUserId, parsedDelta, description || 'Điều chỉnh điểm bởi quản trị viên']);

    return { userId: parsedUserId, points: nextPoints };
  },

  async redeemReward(userId, rewardId) {
    await ensurePointsSchema();
    const parsedUserId = Number(userId);
    const parsedRewardId = Number(rewardId);

    const [rewardRows] = await db.query(`
      SELECT reward_id, reward_name, required_points, reward_type, reward_value
      FROM Reward_Rules
      WHERE reward_id = ? AND status = TRUE
    `, [parsedRewardId]);

    if (!rewardRows.length) {
      throw new Error('Không tìm thấy phần thưởng này.');
    }

    const reward = rewardRows[0];
    const [userRows] = await db.query(`SELECT id, point FROM User WHERE id = ?`, [parsedUserId]);
    if (!userRows.length) {
      throw new Error('Không tìm thấy người dùng.');
    }

    const currentPoints = Number(userRows[0].point || 0);
    const requiredPoints = Number(reward.required_points || 0);
    if (currentPoints < requiredPoints) {
      throw new Error('Bạn không đủ điểm để đổi phần thưởng này.');
    }

    const nextPoints = currentPoints - requiredPoints;
    await db.query(`UPDATE User SET point = ? WHERE id = ?`, [nextPoints, parsedUserId]);
    await db.query(`
      INSERT INTO Point_History (user_id, points_change, description, expires_at)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 12 MONTH))
    `, [parsedUserId, -requiredPoints, `Đổi quà: ${reward.reward_name}`]);

    return { points: nextPoints, reward };
  },

  async listMembershipLevels() {
    await ensurePointsSchema();
    const [rows] = await db.query(`
      SELECT level_id, level_name, min_points, max_points, benefits, discount_percent, created_at
      FROM Membership_Levels
      ORDER BY min_points ASC, level_id ASC
    `);
    return rows.map(formatLevel);
  },

  async createMembershipLevel(payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      INSERT INTO Membership_Levels (level_name, min_points, max_points, benefits, discount_percent)
      VALUES (?, ?, ?, ?, ?)
    `, [
      payload.levelName || payload.level_name || 'Hạng mới',
      Number(payload.minPoints || payload.min_points || 0),
      Number(payload.maxPoints || payload.max_points || 0),
      payload.benefits || '',
      Number(payload.discountPercent || payload.discount_percent || 0),
    ]);
    return { id: result.insertId };
  },

  async updateMembershipLevel(id, payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      UPDATE Membership_Levels
      SET level_name = ?, min_points = ?, max_points = ?, benefits = ?, discount_percent = ?
      WHERE level_id = ?
    `, [
      payload.levelName || payload.level_name || 'Hạng mới',
      Number(payload.minPoints || payload.min_points || 0),
      Number(payload.maxPoints || payload.max_points || 0),
      payload.benefits || '',
      Number(payload.discountPercent || payload.discount_percent || 0),
      id,
    ]);
    return result.affectedRows > 0;
  },

  async deleteMembershipLevel(id) {
    await ensurePointsSchema();
    const [result] = await db.query(`DELETE FROM Membership_Levels WHERE level_id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async listPointRules() {
    await ensurePointsSchema();
    const [rows] = await db.query(`
      SELECT rule_id, rule_name, rule_scope, rule_key, spending_amount, earned_points, points_value, status, expires_in_months
      FROM Point_Rules
      ORDER BY spending_amount ASC, rule_id ASC
    `);
    return rows.map(formatRule);
  },

  async createPointRule(payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      INSERT INTO Point_Rules (rule_name, rule_scope, rule_key, spending_amount, earned_points, points_value, status, expires_in_months)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      payload.ruleName || payload.rule_name || 'Quy tắc mới',
      normalizeRuleScope(payload.ruleScope || payload.rule_scope || payload.entityType || payload.entity_type || 'order'),
      normalizeRuleKey(payload.ruleKey || payload.rule_key || payload.entityKey || payload.entity_key || ''),
      Number(payload.spendingAmount || payload.spending_amount || 0),
      Number(payload.earnedPoints || payload.earned_points || 0),
      Number(payload.pointsValue || payload.points_value || 0),
      normalizeStatus(payload.status),
      Number(payload.expiresInMonths || payload.expires_in_months || 12),
    ]);
    return { id: result.insertId };
  },

  async updatePointRule(id, payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      UPDATE Point_Rules
      SET rule_name = ?, rule_scope = ?, rule_key = ?, spending_amount = ?, earned_points = ?, points_value = ?, status = ?, expires_in_months = ?
      WHERE rule_id = ?
    `, [
      payload.ruleName || payload.rule_name || 'Quy tắc mới',
      normalizeRuleScope(payload.ruleScope || payload.rule_scope || payload.entityType || payload.entity_type || 'order'),
      normalizeRuleKey(payload.ruleKey || payload.rule_key || payload.entityKey || payload.entity_key || ''),
      Number(payload.spendingAmount || payload.spending_amount || 0),
      Number(payload.earnedPoints || payload.earned_points || 0),
      Number(payload.pointsValue || payload.points_value || 0),
      normalizeStatus(payload.status),
      Number(payload.expiresInMonths || payload.expires_in_months || 12),
      id,
    ]);
    return result.affectedRows > 0;
  },

  async deletePointRule(id) {
    await ensurePointsSchema();
    const [result] = await db.query(`DELETE FROM Point_Rules WHERE rule_id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async listRewardRules() {
    await ensurePointsSchema();
    const [rows] = await db.query(`
      SELECT reward_id, reward_name, required_points, reward_type, reward_value, status
      FROM Reward_Rules
      ORDER BY required_points ASC, reward_id ASC
    `);
    return rows.map(formatReward);
  },

  async createRewardRule(payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      INSERT INTO Reward_Rules (reward_name, required_points, reward_type, reward_value, status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      payload.rewardName || payload.reward_name || 'Quà mới',
      Number(payload.requiredPoints || payload.required_points || 0),
      payload.rewardType || payload.reward_type || 'voucher',
      payload.rewardValue || payload.reward_value || '',
      normalizeStatus(payload.status),
    ]);
    return { id: result.insertId };
  },

  async updateRewardRule(id, payload) {
    await ensurePointsSchema();
    const [result] = await db.query(`
      UPDATE Reward_Rules
      SET reward_name = ?, required_points = ?, reward_type = ?, reward_value = ?, status = ?
      WHERE reward_id = ?
    `, [
      payload.rewardName || payload.reward_name || 'Quà mới',
      Number(payload.requiredPoints || payload.required_points || 0),
      payload.rewardType || payload.reward_type || 'voucher',
      payload.rewardValue || payload.reward_value || '',
      normalizeStatus(payload.status),
      id,
    ]);
    return result.affectedRows > 0;
  },

  async deleteRewardRule(id) {
    await ensurePointsSchema();
    const [result] = await db.query(`DELETE FROM Reward_Rules WHERE reward_id = ?`, [id]);
    return result.affectedRows > 0;
  },
};
