import { db } from "../../../config/db.js";
import { PointsModel } from "./pointsModel.js";

const UNIT_PRICE_BY_TYPE = {
  regular: 80000,
  vip: 100000,
  couple: 120000,
};

let bookingSchemaPromise = null;
let showtimePriceColumnsCache = null;

const getShowtimePriceColumns = async () => {
  if (showtimePriceColumnsCache) return showtimePriceColumnsCache;
  const [cols] = await db.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Showtimes'",
  );
  const colSet = new Set(cols.map((c) => c.COLUMN_NAME));
  showtimePriceColumnsCache = {
    hasPriceStandard: colSet.has("price_standard"),
    hasPriceVip: colSet.has("price_vip"),
    hasPriceCouple: colSet.has("price_couple"),
  };
  return showtimePriceColumnsCache;
};

const buildBookingError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeSeatUnitType = (value) => {
  const type = String(value || "regular").trim().toLowerCase();
  if (type === "vip") return "vip";
  if (type === "couple") return "couple";
  return "regular";
};

const normalizeSeatUnits = (seatUnits = []) => {
  const byId = new Map();

  (Array.isArray(seatUnits) ? seatUnits : []).forEach((unit) => {
    const id = String(unit?.id || unit?.label || "").trim();
    const seatCodes = Array.from(
      new Set(
        (Array.isArray(unit?.seatCodes) ? unit.seatCodes : [])
          .map((seatCode) => String(seatCode || "").trim().toUpperCase())
          .filter(Boolean),
      ),
    );

    if (!id || seatCodes.length === 0) return;

    byId.set(id, {
      id,
      label: String(unit?.label || id).trim(),
      type: normalizeSeatUnitType(unit?.type),
      seatCodes,
    });
  });

  return Array.from(byId.values());
};

const normalizeFoodItems = (foodItems = []) => {
  const groups = new Map();

  (Array.isArray(foodItems) ? foodItems : []).forEach((item) => {
    const comboId = Number(item?.comboId || item?.combo_id || 0);
    const quantity = Math.max(0, Number(item?.quantity || 0) || 0);
    if (!comboId || quantity <= 0) return;

    const popcornType = String(item?.popcornType || item?.selected_popcorn_type || "").trim();
    const drinkType = String(item?.drinkType || item?.selected_drink_type || "").trim();
    const groupKey = `${comboId}__${popcornType}__${drinkType}`;

    groups.set(groupKey, {
      comboId,
      quantity: quantity + Number(groups.get(groupKey)?.quantity || 0),
      popcornType,
      drinkType,
    });
  });

  return Array.from(groups.values());
};

const generateBookingCode = () =>
  `LNX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const shouldMarkAsPaidImmediately = (paymentMethod = "") => {
  const normalizedPaymentMethod = String(paymentMethod || "").trim().toLowerCase();
  return normalizedPaymentMethod === "cash" || normalizedPaymentMethod === "cashier";
};

const awardBookingPoints = async (connection, userId, orderId, totalAmount, seatUnits = [], foodItems = []) => {
  await PointsModel.ensureSchema();

  const [ruleRows] = await connection.query(
    `
    SELECT rule_id, rule_name, rule_scope, rule_key, spending_amount, earned_points, points_value, expires_in_months
    FROM Point_Rules
    WHERE status = TRUE
    ORDER BY spending_amount ASC, rule_id ASC
    `,
  );

  const normalizedTotalAmount = Number(totalAmount || 0);
  const seatRules = ruleRows.filter((rule) => String(rule.rule_scope || 'order').toLowerCase() === 'seat');
  const comboRules = ruleRows.filter((rule) => String(rule.rule_scope || 'order').toLowerCase() === 'combo');
  const orderRules = ruleRows.filter((rule) => String(rule.rule_scope || 'order').toLowerCase() === 'order');

  const seatPoints = (Array.isArray(seatUnits) ? seatUnits : []).reduce((sum, unit) => {
    const seatType = String(unit?.type || '').trim().toLowerCase();
    const rule = seatRules.find((candidate) => String(candidate.rule_key || '').trim().toLowerCase() === seatType);
    if (!rule) return sum;
    return sum + Number(rule.points_value || 0);
  }, 0);

  const comboPoints = (Array.isArray(foodItems) ? foodItems : []).reduce((sum, item) => {
    const comboKey = String(item?.comboType || item?.combo_key || item?.comboName || '').trim().toLowerCase();
    const rule = comboRules.find((candidate) => String(candidate.rule_key || '').trim().toLowerCase() === comboKey);
    if (!rule) return sum;
    return sum + Number(rule.points_value || 0) * Number(item?.quantity || 0);
  }, 0);

  let earnedPoints = seatPoints + comboPoints;

  if (normalizedTotalAmount > 0 && orderRules.length > 0) {
    const candidates = orderRules.filter((rule) => Number(rule.spending_amount || 0) > 0);
    if (candidates.length > 0) {
      const bestRule = candidates.reduce((best, current) => {
        const currentThreshold = Number(current.spending_amount || 0);
        const bestThreshold = Number(best.spending_amount || 0);
        if (currentThreshold > normalizedTotalAmount) {
          return best;
        }
        const currentPoints = Math.floor(normalizedTotalAmount / currentThreshold) * Number(current.earned_points || 0);
        const bestPoints = Math.floor(normalizedTotalAmount / bestThreshold) * Number(best.earned_points || 0);
        return currentPoints > bestPoints ? current : best;
      }, candidates[0]);

      const threshold = Number(bestRule.spending_amount || 0);
      earnedPoints += threshold > 0 ? Math.floor(normalizedTotalAmount / threshold) * Number(bestRule.earned_points || 0) : 0;
    }
  }

  if (!earnedPoints) {
    return { earnedPoints: 0, newPoints: Number((await connection.query(`SELECT point FROM User WHERE id = ?`, [userId]))[0][0]?.point || 0) };
  }

  const [userRows] = await connection.query(`SELECT point FROM User WHERE id = ?`, [userId]);
  const currentPoints = Number(userRows[0]?.point || 0);
  const nextPoints = currentPoints + earnedPoints;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 12);

  await connection.query(`UPDATE User SET point = ? WHERE id = ?`, [nextPoints, userId]);
  await connection.query(
    `
    INSERT INTO Point_History (user_id, points_change, description, expires_at)
    VALUES (?, ?, ?, ?)
    `,
    [userId, earnedPoints, `Tích điểm đặt vé #${orderId}`, expiresAt],
  );

  return { earnedPoints, newPoints: nextPoints, expiresAt };
};

const ensureBookingSchema = async () => {
  if (bookingSchemaPromise) return bookingSchemaPromise;

  bookingSchemaPromise = (async () => {
    const [orderComboColumns] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Order_Combos'",
    );
    const columnSet = new Set(orderComboColumns.map((column) => column.COLUMN_NAME));
    const alterStatements = [];

    if (!columnSet.has("selected_popcorn_type")) {
      alterStatements.push(
        "ALTER TABLE Order_Combos ADD COLUMN selected_popcorn_type VARCHAR(100) NULL AFTER quantity",
      );
    }

    if (!columnSet.has("selected_drink_type")) {
      alterStatements.push(
        "ALTER TABLE Order_Combos ADD COLUMN selected_drink_type VARCHAR(100) NULL AFTER selected_popcorn_type",
      );
    }

    for (const statement of alterStatements) {
      await db.query(statement);
    }

    return {
      orderCombos: {
        hasSelectedPopcornType: true,
        hasSelectedDrinkType: true,
      },
    };
  })();

  return bookingSchemaPromise;
};

export const BookingModel = {
  /**
   * Lấy danh sách booking của một user cụ thể (dùng cho trang profile user).
   * Trả về đầy đủ thông tin để hiển thị "Vé của tôi" và "Lịch sử đặt vé".
   */
  async expirePendingBookings() {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [pendingOrders] = await connection.query(
        `
        SELECT order_id, booking_code
        FROM Orders
        WHERE status = 'pending'
          AND payment_status IN ('pending', 'unpaid')
          AND created_at < NOW() - INTERVAL 5 MINUTE
        FOR UPDATE
        `,
      );

      for (const order of pendingOrders) {
        const [ticketRows] = await connection.query(
          `
          SELECT showtime_id, COUNT(*) AS ticket_count
          FROM Tickets
          WHERE order_id = ?
          GROUP BY showtime_id
          `,
          [order.order_id],
        );

        for (const ticketRow of ticketRows) {
          await connection.query(
            `
            UPDATE Showtimes
            SET available_seats = COALESCE(available_seats, 0) + ?
            WHERE showtime_id = ?
            `,
            [Number(ticketRow.ticket_count || 0), ticketRow.showtime_id],
          );
        }

        await connection.query(
          `
          UPDATE Tickets
          SET ticket_status = 'cancelled'
          WHERE order_id = ?
          `,
          [order.order_id],
        );

        await connection.query(
          `
          UPDATE Orders
          SET status = 'cancelled', payment_status = 'expired'
          WHERE order_id = ?
          `,
          [order.order_id],
        );
      }

      await connection.commit();
      return pendingOrders.length;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async findByUserId(userId) {
    await this.expirePendingBookings();
    const [bookings] = await db.query(
      `
      SELECT
        o.order_id      AS booking_id,
        o.booking_code,
        o.total_amount  AS total_price,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        MIN(m.title)        AS movie_title,
        MIN(m.poster)       AS poster,
        MIN(s.start_time)   AS start_time,
        MIN(s.end_time)     AS end_time,
        MIN(c.cinema_name)  AS cinema_name,
        MIN(r.room_name)    AS room_name,
        MIN(r.room_type)    AS room_type,
        GROUP_CONCAT(DISTINCT seat.seat_code ORDER BY seat.seat_code SEPARATOR ', ') AS seat_codes,
        COUNT(DISTINCT t.ticket_id) AS ticket_count,
        MIN(t.qr_code)      AS primary_qr_code,
        MAX(t.check_in_time) AS check_in_time
      FROM Orders o
      LEFT JOIN Tickets t    ON t.order_id    = o.order_id
      LEFT JOIN Showtimes s  ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m     ON s.movie_id    = m.movie_id
      LEFT JOIN Rooms r      ON s.room_id     = r.room_id
      LEFT JOIN Cinemas c    ON r.cinema_id   = c.cinemas_id
      LEFT JOIN Seats seat   ON seat.seat_id  = t.seat_id
      WHERE o.user_id = ?
      GROUP BY
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at
      ORDER BY o.created_at DESC
      `,
      [userId],
    );
    return bookings;
  },

  /**
   * Lấy danh sách booking với các tùy chọn filter và search.
   */
  async findAll(filters = {}) {
    await this.expirePendingBookings();
    let query = `
      SELECT
        o.order_id AS booking_id,
        o.booking_code,
        o.total_amount AS total_price,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.full_name,
        u.email,
        u.phone,
        MIN(m.title) AS movie_title,
        MIN(s.start_time) AS start_time,
        MIN(c.cinema_name) AS cinema_name,
        MIN(r.room_name) AS room_name,
        GROUP_CONCAT(DISTINCT seat.seat_code ORDER BY seat.seat_code SEPARATOR ', ') AS seat_codes,
        MAX(t.check_in_time) AS check_in_time
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      LEFT JOIN Rooms r ON s.room_id = r.room_id
      LEFT JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      LEFT JOIN Seats seat ON seat.seat_id = t.seat_id
    `;

    const queryParams = [];
    const whereClauses = [];

    if (filters.status) {
      whereClauses.push("o.status = ?");
      queryParams.push(filters.status);
    }

    if (filters.search) {
      whereClauses.push(
        "(u.full_name LIKE ? OR u.email LIKE ? OR m.title LIKE ? OR o.booking_code LIKE ?)",
      );
      const searchTerm = `%${filters.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (whereClauses.length > 0) {
      query += " WHERE " + whereClauses.join(" AND ");
    }

    query += `
      GROUP BY
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.full_name,
        u.email,
        u.phone
      ORDER BY o.created_at DESC
    `;

    const [bookings] = await db.query(query, queryParams);
    return bookings;
  },

  /**
   * Lấy chi tiết một booking bằng ID.
   */
  async findById(id) {
    await this.expirePendingBookings();
    const [bookingDetails] = await db.query(
      `
      SELECT
        o.order_id AS booking_id,
        o.booking_code,
        o.total_amount AS total_price,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone AS phone_number,
        MIN(s.start_time) AS start_time,
        MIN(s.end_time) AS end_time,
        MIN(m.title) AS movie_title,
        MIN(m.poster) AS poster,
        MIN(c.cinema_name) AS cinema_name,
        MIN(r.room_name) AS room_name,
        MIN(t.qr_code) AS primary_qr_code,
        MAX(t.check_in_time) AS check_in_time
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      LEFT JOIN Rooms r ON s.room_id = r.room_id
      LEFT JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      WHERE o.order_id = ?
      GROUP BY
        o.order_id,
        o.booking_code,
        o.total_amount,
        o.payment_method,
        o.payment_status,
        o.status,
        o.created_at,
        u.id,
        u.full_name,
        u.email,
        u.phone
    `,
      [id],
    );

    if (!bookingDetails.length) return null;
    const booking = bookingDetails[0];

    const [seats] = await db.query(
      `
      SELECT s.seat_code, t.qr_code, t.ticket_status, t.check_in_time
      FROM Tickets t
      JOIN Seats s ON s.seat_id = t.seat_id
      WHERE t.order_id = ?
      ORDER BY s.seat_code
    `,
      [id],
    );
    booking.seats = seats.map((s) => s.seat_code);
    booking.qr_codes = seats.map((s) => s.qr_code).filter(Boolean);
    booking.primary_qr_code =
      booking.primary_qr_code || booking.qr_codes[0] || booking.booking_code;
    booking.check_in_time =
      booking.check_in_time || seats.find((seat) => seat.check_in_time)?.check_in_time || null;

    const [combos] = await db.query(
      `
      SELECT
        c.combo_name,
        oc.quantity,
        c.price,
        oc.selected_popcorn_type,
        oc.selected_drink_type
      FROM Order_Combos oc
      JOIN Combos c ON c.combo_id = oc.combo_id
      WHERE oc.order_id = ?
    `,
      [id],
    );
    booking.combos = combos;

    return booking;
  },

  /**
   * Tìm booking bằng mã code.
   */
  async findByCode(code) {
    const [bookingDetails] = await db.query(
      `
      SELECT 
        o.order_id AS booking_id,
        o.booking_code,
        o.status,
        u.full_name,
        MIN(m.title) AS movie_title,
        MIN(s.start_time) AS start_time,
        MAX(t.check_in_time) AS check_in_time
      FROM Orders o
      JOIN User u ON o.user_id = u.id
      LEFT JOIN Tickets t ON t.order_id = o.order_id
      LEFT JOIN Showtimes s ON t.showtime_id = s.showtime_id
      LEFT JOIN Movies m ON s.movie_id = m.movie_id
      WHERE o.booking_code = ? OR t.qr_code = ?
      GROUP BY o.order_id, o.booking_code, o.status, u.full_name
    `,
      [code, code],
    );
    return bookingDetails[0] || null;
  },

  /**
   * Cập nhật trạng thái của một booking.
   */
  async updateStatus(id, status) {
    const [result] = await db.query(
      "UPDATE Orders SET status = ? WHERE order_id = ?",
      [status, id],
    );
    return result.affectedRows > 0;
  },

  async checkIn(id) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [[order]] = await connection.query(
        "SELECT order_id, status FROM Orders WHERE order_id = ? FOR UPDATE",
        [id],
      );

      if (!order) {
        await connection.rollback();
        return false;
      }

      await connection.query(
        `
        UPDATE Tickets
        SET ticket_status = 'used',
            check_in_time = COALESCE(check_in_time, NOW())
        WHERE order_id = ?
      `,
        [id],
      );

      await connection.query(
        "UPDATE Orders SET status = 'completed' WHERE order_id = ?",
        [id],
      );

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async createUserBooking({
    userId,
    showtimeId,
    seatUnits = [],
    foodItems = [],
    paymentMethod = "zalopay",
  }) {
    await ensureBookingSchema();

    const normalizedUserId = Number(userId || 0);
    const normalizedShowtimeId = Number(showtimeId || 0);
    const normalizedSeatUnits = normalizeSeatUnits(seatUnits);
    const normalizedFoodItems = normalizeFoodItems(foodItems);
    const initialPaymentStatus = shouldMarkAsPaidImmediately(paymentMethod) ? 'paid' : 'pending';
    const initialOrderStatus = shouldMarkAsPaidImmediately(paymentMethod) ? 'confirmed' : 'pending';

    if (!normalizedUserId) {
      throw buildBookingError("Không xác định được người dùng đặt vé.");
    }

    if (!normalizedShowtimeId) {
      throw buildBookingError("Không xác định được suất chiếu.");
    }

    if (normalizedSeatUnits.length === 0) {
      throw buildBookingError("Bạn chưa chọn ghế.");
    }

    const requestedSeatCodes = Array.from(
      new Set(normalizedSeatUnits.flatMap((unit) => unit.seatCodes)),
    );

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const showtimePriceCols = await getShowtimePriceColumns();
      const priceStandardExpr = showtimePriceCols.hasPriceStandard
        ? "COALESCE(price_standard, price)"
        : "price";
      const priceVipExpr = showtimePriceCols.hasPriceVip
        ? "COALESCE(price_vip, price)"
        : priceStandardExpr;
      const priceCoupleExpr = showtimePriceCols.hasPriceCouple
        ? "COALESCE(price_couple, price)"
        : priceStandardExpr;

      const [[showtime]] = await connection.query(
        `
        SELECT showtime_id, room_id, available_seats, status,
               price,
               ${priceStandardExpr} AS price_standard,
               ${priceVipExpr}      AS price_vip,
               ${priceCoupleExpr}   AS price_couple
        FROM Showtimes
        WHERE showtime_id = ?
        FOR UPDATE
      `,
        [normalizedShowtimeId],
      );

      if (!showtime || showtime.status !== "active") {
        throw buildBookingError("Suất chiếu không tồn tại hoặc đã ngừng bán.", 404);
      }

      if (
        showtime.available_seats !== null &&
        Number(showtime.available_seats || 0) < requestedSeatCodes.length
      ) {
        throw buildBookingError("Số ghế trống không đủ cho lựa chọn hiện tại.");
      }

      const [seatRows] = await connection.query(
        `
        SELECT seat_id, seat_code, seat_type, status
        FROM Seats
        WHERE room_id = ?
          AND seat_code IN (${requestedSeatCodes.map(() => "?").join(", ")})
        FOR UPDATE
      `,
        [showtime.room_id, ...requestedSeatCodes],
      );

      if (seatRows.length !== requestedSeatCodes.length) {
        throw buildBookingError("Có ghế không thuộc phòng chiếu của suất này.");
      }

      const seatByCode = new Map(
        seatRows.map((seat) => [String(seat.seat_code || "").trim().toUpperCase(), seat]),
      );

      const invalidSeat = seatRows.find((seat) => seat.status !== "active");
      if (invalidSeat) {
        throw buildBookingError(`Ghế ${invalidSeat.seat_code} hiện không thể đặt.`);
      }

      const [soldSeats] = await connection.query(
        `
        SELECT s.seat_code
        FROM Tickets t
        JOIN Seats s ON s.seat_id = t.seat_id
        JOIN Orders o ON o.order_id = t.order_id
        WHERE t.showtime_id = ?
          AND s.seat_code IN (${requestedSeatCodes.map(() => "?").join(", ")})
          AND t.ticket_status <> 'cancelled'
          AND o.status <> 'cancelled'
      `,
        [normalizedShowtimeId, ...requestedSeatCodes],
      );

      if (soldSeats.length > 0) {
        throw buildBookingError(
          `Ghế ${soldSeats.map((seat) => seat.seat_code).join(", ")} đã được đặt.`,
        );
      }

      // Lấy giá từ showtime, fallback về hằng số mặc định
      const priceByType = {
        regular: Number(showtime.price_standard) > 0 ? Number(showtime.price_standard) : UNIT_PRICE_BY_TYPE.regular,
        vip:     Number(showtime.price_vip)      > 0 ? Number(showtime.price_vip)      : UNIT_PRICE_BY_TYPE.vip,
        couple:  Number(showtime.price_couple)   > 0 ? Number(showtime.price_couple)   : UNIT_PRICE_BY_TYPE.couple,
      };

      const seatTotal = normalizedSeatUnits.reduce(
        (sum, unit) => sum + Number(priceByType[normalizeSeatUnitType(unit.type)] || 0),
        0,
      );

      let comboRows = [];
      if (normalizedFoodItems.length > 0) {
        const comboIds = Array.from(
          new Set(normalizedFoodItems.map((item) => item.comboId).filter(Boolean)),
        );

        [comboRows] = await connection.query(
          `
          SELECT combo_id, combo_name, price, is_active
          FROM Combos
          WHERE combo_id IN (${comboIds.map(() => "?").join(", ")})
        `,
          comboIds,
        );

        if (comboRows.length !== comboIds.length) {
          throw buildBookingError("Một số combo đã chọn không còn tồn tại.");
        }

        const inactiveCombo = comboRows.find((combo) => Number(combo.is_active || 0) !== 1);
        if (inactiveCombo) {
          throw buildBookingError(`Combo "${inactiveCombo.combo_name}" hiện đã ngừng bán.`);
        }
      }

      const comboById = new Map(
        comboRows.map((combo) => [Number(combo.combo_id), Number(combo.price || 0)]),
      );
      const foodTotal = normalizedFoodItems.reduce(
        (sum, item) => sum + Number(comboById.get(item.comboId) || 0) * item.quantity,
        0,
      );
      const totalAmount = seatTotal + foodTotal;

      let bookingCode = generateBookingCode();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const [[existing]] = await connection.query(
          "SELECT order_id FROM Orders WHERE booking_code = ? LIMIT 1",
          [bookingCode],
        );
        if (!existing) break;
        bookingCode = generateBookingCode();
      }

      const [orderResult] = await connection.query(
        `
        INSERT INTO Orders (
          user_id,
          total_amount,
          payment_method,
          payment_status,
          order_date,
          booking_code,
          status
        )
        VALUES (?, ?, ?, ?, NOW(), ?, ?)
      `,
        [normalizedUserId, totalAmount, String(paymentMethod || "zalopay").trim(), initialPaymentStatus, bookingCode, initialOrderStatus],
      );

      const orderId = Number(orderResult.insertId);

      for (const unit of normalizedSeatUnits) {
        for (const seatCode of unit.seatCodes) {
          const seat = seatByCode.get(seatCode);
          if (!seat) continue;

          await connection.query(
            `
            INSERT INTO Tickets (
              order_id,
              showtime_id,
              seat_id,
              qr_code,
              ticket_status
            )
            VALUES (?, ?, ?, ?, 'unused')
          `,
            [
              orderId,
              normalizedShowtimeId,
              seat.seat_id,
              `${bookingCode}-${seatCode}`,
            ],
          );
        }
      }

      for (const item of normalizedFoodItems) {
        await connection.query(
          `
          INSERT INTO Order_Combos (
            order_id,
            combo_id,
            quantity,
            selected_popcorn_type,
            selected_drink_type
          )
          VALUES (?, ?, ?, ?, ?)
        `,
          [
            orderId,
            item.comboId,
            item.quantity,
            item.popcornType || null,
            item.drinkType || null,
          ],
        );
      }

      await connection.query(
        `
        UPDATE Showtimes
        SET available_seats = GREATEST(0, COALESCE(available_seats, 0) - ?)
        WHERE showtime_id = ?
      `,
        [requestedSeatCodes.length, normalizedShowtimeId],
      );

      // Chỉ cộng điểm ngay nếu đơn được xác nhận paid tức thì (cash/cashier)
      let pointsResult = { earnedPoints: 0, newPoints: 0 };
      if (initialPaymentStatus === 'paid') {
        pointsResult = await awardBookingPoints(connection, normalizedUserId, orderId, totalAmount, normalizedSeatUnits, normalizedFoodItems);
      }

      await connection.commit();
      const booking = await this.findById(orderId);
      return {
        ...booking,
        pointsAwarded: Number(pointsResult?.earnedPoints || 0),
        pointsBalance: Number(pointsResult?.newPoints || 0),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Xác nhận thanh toán bằng thẻ (Visa/Mastercard/JCB).
   * Gọi sau khi frontend validate thông tin thẻ thành công.
   * Mark order → paid/confirmed, sau đó cộng điểm.
   */
  async confirmCardPayment({ orderId, userId }) {
    const normalizedOrderId = Number(orderId || 0);
    const normalizedUserId = Number(userId || 0);

    if (!normalizedOrderId) throw buildBookingError("Không xác định được đơn hàng.");
    if (!normalizedUserId) throw buildBookingError("Không xác định được người dùng.");

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Lấy thông tin order
      const [[order]] = await connection.query(
        `SELECT order_id, user_id, total_amount, payment_status, status
         FROM Orders WHERE order_id = ? FOR UPDATE`,
        [normalizedOrderId],
      );

      if (!order) throw buildBookingError("Đơn hàng không tồn tại.", 404);
      if (Number(order.user_id) !== normalizedUserId) throw buildBookingError("Không có quyền truy cập đơn hàng này.", 403);
      if (order.payment_status === 'paid') throw buildBookingError("Đơn hàng đã được thanh toán trước đó.");

      // Mark paid
      await connection.query(
        `UPDATE Orders SET payment_status = 'paid', status = 'confirmed' WHERE order_id = ?`,
        [normalizedOrderId],
      );

      // Lấy seat units và food items để tính điểm
      const [ticketRows] = await connection.query(
        `SELECT s.seat_type FROM Tickets t
         JOIN Seats s ON s.seat_id = t.seat_id
         WHERE t.order_id = ?`,
        [normalizedOrderId],
      );
      const [comboRows] = await connection.query(
        `SELECT c.combo_name, oc.quantity FROM Order_Combos oc
         JOIN Combos c ON c.combo_id = oc.combo_id
         WHERE oc.order_id = ?`,
        [normalizedOrderId],
      );

      const seatUnitsForPoints = ticketRows.map((row) => ({ type: row.seat_type }));
      const foodItemsForPoints = comboRows.map((row) => ({
        comboName: row.combo_name,
        quantity: Number(row.quantity || 1),
      }));

      const pointsResult = await awardBookingPoints(
        connection,
        normalizedUserId,
        normalizedOrderId,
        Number(order.total_amount || 0),
        seatUnitsForPoints,
        foodItemsForPoints,
      );

      await connection.commit();

      const booking = await this.findById(normalizedOrderId);
      return {
        ...booking,
        pointsAwarded: Number(pointsResult?.earnedPoints || 0),
        pointsBalance: Number(pointsResult?.newPoints || 0),
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
