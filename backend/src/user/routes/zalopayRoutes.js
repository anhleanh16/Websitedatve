/**
 * ZaloPay Payment Gateway Routes
 * Tích hợp theo: https://docs.zalopay.vn/docs/guides/payment-acceptance/payment-gateway/intro
 *
 * Sandbox credentials (app_id = 2553):
 *   ZALOPAY_APP_ID   = 2553
 *   ZALOPAY_KEY1     = PcY4in5zKmuiveAc
 *   ZALOPAY_KEY2     = kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz
 *   ZALOPAY_ENDPOINT = https://sb-openapi.zalopay.vn/v2/create
 *   ZALOPAY_QUERY_ENDPOINT = https://sb-openapi.zalopay.vn/v2/query
 *   ZALOPAY_CALLBACK_URL   = (ngrok hoặc server URL)/api/zalopay/callback
 *   ZALOPAY_REDIRECT_URL   = http://localhost:5173/payment/result
 *   FRONTEND_URL     = http://localhost:5173
 */

import express from 'express';
import { createHmac } from 'node:crypto';
import { db } from '../../../config/db.js';
import { BookingModel } from '../../admin/models/bookingModel.js';
import { authMiddleware, selfOrAdminOnly } from '../../admin/middleware/authMiddleware.js';

const router = express.Router();

// ── Đảm bảo bảng Pending_Payments tồn tại ────────────────────────────────────
let pendingPaymentsReady = false;
const ensurePendingPaymentsTable = async () => {
  if (pendingPaymentsReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS Pending_Payments (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      app_trans_id   VARCHAR(100) NOT NULL UNIQUE,
      user_id        INT NOT NULL,
      movie_id       INT NULL,
      showtime_id    INT NOT NULL,
      seat_units     LONGTEXT NOT NULL,
      food_items     LONGTEXT NOT NULL,
      payment_method VARCHAR(50) NOT NULL DEFAULT 'zalopay',
      amount         DECIMAL(12,2) NOT NULL,
      description    TEXT,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at     DATETIME NOT NULL
    )
  `);
  pendingPaymentsReady = true;
};

// ── Helper: format app_trans_id = YYMMDD_appId_timestamp ─────────────────────
function makeAppTransId(appId) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}_${appId}_${Date.now()}`;
}

// ── Helper: build ZaloPay Gateway redirect URL từ zp_trans_token ──────────────
// Sandbox: https://qcgateway.zalopay.vn/openinapp?order=BASE64({"zptranstoken":"...","appid":553})
// Production: https://gateway.zalopay.vn/openinapp?order=...
function buildGatewayUrl(appId, zpTransToken) {
  if (!zpTransToken) return '';
  const isSandbox = String(process.env.ZALOPAY_ENDPOINT || '').includes('sb-openapi');
  const gatewayBase = isSandbox
    ? 'https://qcgateway.zalopay.vn/openinapp'
    : 'https://gateway.zalopay.vn/openinapp';
  const orderObj = { zptranstoken: zpTransToken, appid: Number(appId) };
  const orderB64 = Buffer.from(JSON.stringify(orderObj)).toString('base64');
  return `${gatewayBase}?order=${orderB64}`;
}

// ── POST /:userId/payments/zalopay — Tạo đơn hàng ZaloPay ────────────────────
// KHÔNG tạo booking ngay — chỉ lưu pending data, tạo ZaloPay order
// Booking thật được tạo trong callback khi thanh toán thành công
router.post('/:userId/payments/zalopay', authMiddleware, selfOrAdminOnly, async (req, res) => {
  try {
    await ensurePendingPaymentsTable();

    const {
      amount, description, preferredMethod,
      // booking data — lưu tạm để tạo booking khi callback
      movieId, showtimeId, seatUnits, foodItems, paymentMethod: pm,
    } = req.body;

    const userId = Number(req.params.userId || req.user?.id || 0);

    const appId        = process.env.ZALOPAY_APP_ID   || '553';
    const key1         = process.env.ZALOPAY_KEY1      || '9phuAOYhan4urywHTh0ndEXiV3pKHr5Q';
    const endpoint     = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
    const callbackUrl  = process.env.ZALOPAY_CALLBACK_URL  || '';
    const redirectUrl  = process.env.ZALOPAY_REDIRECT_URL  || 'http://localhost:5173/payment/result';

    const parsedAmount = Math.round(Number(amount || 0)); // ZaloPay yêu cầu integer (VND)
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ.' });
    }
    if (!showtimeId || !Array.isArray(seatUnits) || seatUnits.length === 0) {
      return res.status(400).json({ message: 'Thiếu thông tin suất chiếu hoặc ghế.' });
    }

    const appTransId = makeAppTransId(appId);
    const appTime    = Date.now();
    const appUser    = String(userId || 'sweetstar-user');
    const note       = String(description || 'SWEETSTAR PAYMENT').trim().slice(0, 256);

    // Lưu booking data vào Pending_Payments (hết hạn sau 15 phút)
    await db.query(
      `INSERT INTO Pending_Payments
         (app_trans_id, user_id, movie_id, showtime_id, seat_units, food_items, payment_method, amount, description, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [
        appTransId,
        userId,
        Number(movieId || 0) || null,
        Number(showtimeId),
        JSON.stringify(Array.isArray(seatUnits) ? seatUnits : []),
        JSON.stringify(Array.isArray(foodItems) ? foodItems : []),
        String(pm || preferredMethod || 'zalopay'),
        parsedAmount,
        note,
      ],
    );

    const embedDataObj = {
      redirecturl: redirectUrl,
      ...(preferredMethod ? { preferred_payment_method: [preferredMethod] } : { preferred_payment_method: [] }),
    };
    const embedData = JSON.stringify(embedDataObj);

    const item = JSON.stringify([{
      itemid:       appTransId,
      itemname:     note,
      itemprice:    parsedAmount,  // integer
      itemquantity: 1,
    }]);

    // MAC = HMAC-SHA256(key1, app_id|app_trans_id|app_user|amount|app_time|embed_data|item)
    const macData = `${appId}|${appTransId}|${appUser}|${parsedAmount}|${appTime}|${embedData}|${item}`;
    const mac = createHmac('sha256', key1).update(macData).digest('hex');

    const payload = {
      app_id:       Number(appId),
      app_user:     appUser,
      app_time:     appTime,
      amount:       parsedAmount,  // integer
      app_trans_id: appTransId,
      embed_data:   embedData,
      item,
      description:  note,
      bank_code:    '',
      callback_url: callbackUrl,
      mac,
    };

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!result || result.return_code !== 1) {
      // ZaloPay từ chối → xóa pending data
      await db.query(`DELETE FROM Pending_Payments WHERE app_trans_id = ?`, [appTransId]).catch(() => {});
      console.error('[ZaloPay] Create order failed:', JSON.stringify(result));
      console.error('[ZaloPay] Payload sent:', JSON.stringify({ ...payload, mac: '***' }));
      return res.status(502).json({
        message: result?.return_message || 'ZaloPay không tạo được đơn hàng.',
        zlpError: result,
      });
    }

    return res.json({
      orderUrl:     buildGatewayUrl(appId, result.zp_trans_token || result.order_token || ''),
      qrCode:       result.qr_code       || '',
      appTransId,
      zpTransToken: result.zp_trans_token || result.order_token || '',
    });
  } catch (err) {
    console.error('[ZaloPay] Create order error:', err);
    return res.status(500).json({ message: err.message || 'Không thể tạo đơn hàng ZaloPay.' });
  }
});

// ── GET /payments/zalopay/query — Query trạng thái đơn hàng ─────────────────
// Dùng khi redirect về mà chưa nhận callback
router.get('/payments/zalopay/query', async (req, res) => {
  try {
    const { app_trans_id } = req.query;
    if (!app_trans_id) {
      return res.status(400).json({ message: 'Thiếu app_trans_id.' });
    }

    const appId    = process.env.ZALOPAY_APP_ID     || '553';
    const key1     = process.env.ZALOPAY_KEY1       || '9phuAOYhan4urywHTh0ndEXiV3pKHr5Q';
    const endpoint = process.env.ZALOPAY_QUERY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/query';

    const macData = `${appId}|${app_trans_id}|${key1}`;
    const mac = createHmac('sha256', key1).update(macData).digest('hex');

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ app_id: Number(appId), app_trans_id, mac }),
    });

    const result = await response.json().catch(() => null);

    // Kèm theo booking nếu đã được tạo (callback đã xử lý)
    let booking = null;
    try {
      const [[order]] = await db.query(
        `SELECT order_id AS booking_id, booking_code, status, payment_status
         FROM Orders WHERE zalopay_trans_id = ? LIMIT 1`,
        [String(app_trans_id)],
      );
      booking = order || null;
    } catch (_) {}

    return res.json({ ...(result || { return_code: -1, return_message: 'Không có phản hồi.' }), booking });
  } catch (err) {
    console.error('[ZaloPay] Query order error:', err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /payments/zalopay/confirm — Tạo booking sau thanh toán ZaloPay (demo) ─
router.post('/payments/zalopay/confirm', async (req, res) => {
  try {
    await ensurePendingPaymentsTable();

    const { app_trans_id } = req.body;
    if (!app_trans_id) {
      return res.status(400).json({ message: 'Thiếu app_trans_id.' });
    }

    // Kiểm tra đã tạo booking chưa (tránh duplicate)
    const [[existingOrder]] = await db.query(
      `SELECT order_id AS booking_id, booking_code, status, payment_status
       FROM Orders WHERE zalopay_trans_id = ? LIMIT 1`,
      [String(app_trans_id)],
    );
    if (existingOrder) {
      return res.json({ success: true, booking: existingOrder, alreadyConfirmed: true });
    }

    // Lấy pending data
    const [[pending]] = await db.query(
      `SELECT * FROM Pending_Payments WHERE app_trans_id = ?`,
      [String(app_trans_id)],
    );
    if (!pending) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin đặt vé.' });
    }

    // Tạo booking (demo — không verify ZaloPay)
    const seatUnits = JSON.parse(pending.seat_units || '[]');
    const foodItems = JSON.parse(pending.food_items || '[]');

    const booking = await BookingModel.createUserBooking({
      userId:        Number(pending.user_id),
      showtimeId:    Number(pending.showtime_id),
      seatUnits,
      foodItems,
      paymentMethod: 'zalopay',
    });

    // Mark paid + lưu app_trans_id
    await db.query(
      `UPDATE Orders SET status = 'confirmed', payment_status = 'paid', zalopay_trans_id = ?
       WHERE booking_code = ?`,
      [String(app_trans_id), String(booking.booking_code || '')],
    );

    // Cộng điểm
    try {
      await BookingModel.confirmCardPayment({
        orderId: booking.booking_id,
        userId:  Number(pending.user_id),
      });
    } catch (pointsErr) {
      console.warn('[ZaloPay] Points award failed (non-critical):', pointsErr.message);
    }

    // Xóa pending data
    await db.query(`DELETE FROM Pending_Payments WHERE app_trans_id = ?`, [String(app_trans_id)]).catch(() => {});

    const [[finalBooking]] = await db.query(
      `SELECT order_id AS booking_id, booking_code, status, payment_status
       FROM Orders WHERE booking_code = ? LIMIT 1`,
      [String(booking.booking_code || '')],
    );

    return res.json({ success: true, booking: finalBooking || booking });
  } catch (err) {
    console.error('[ZaloPay] Confirm error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /payments/zalopay/callback — Nhận IPN từ ZaloPay Server ─────────────
// ZaloPay gọi endpoint này khi thanh toán thành công
// Không cần auth — nhưng phải verify MAC bằng key2
router.post('/payments/zalopay/callback', async (req, res) => {
  try {
    await ensurePendingPaymentsTable();

    const key2 = process.env.ZALOPAY_KEY2 || 'A53q3asfJ9qQMEVDUuruW86nIloLoAUq';
    const { data: dataStr, mac: receivedMac } = req.body;

    // Verify MAC
    const expectedMac = createHmac('sha256', key2).update(dataStr).digest('hex');
    if (expectedMac !== receivedMac) {
      console.warn('[ZaloPay] Callback MAC mismatch');
      return res.json({ return_code: -1, return_message: 'MAC không hợp lệ.' });
    }

    const callbackData = JSON.parse(dataStr);
    const { app_trans_id, amount } = callbackData;

    console.log(`[ZaloPay] ✅ Callback — app_trans_id: ${app_trans_id}, amount: ${amount}`);

    // Lấy pending data
    const [[pending]] = await db.query(
      `SELECT * FROM Pending_Payments WHERE app_trans_id = ? AND expires_at > NOW()`,
      [String(app_trans_id || '')],
    );

    if (!pending) {
      // Có thể callback trùng lặp hoặc đã xử lý — kiểm tra xem booking đã tồn tại chưa
      const [[existingOrder]] = await db.query(
        `SELECT order_id FROM Orders WHERE zalopay_trans_id = ? LIMIT 1`,
        [String(app_trans_id || '')],
      );
      if (existingOrder) {
        console.log(`[ZaloPay] Callback duplicate — order already exists for ${app_trans_id}`);
        return res.json({ return_code: 1, return_message: 'Success.' });
      }
      console.warn(`[ZaloPay] No pending payment found for ${app_trans_id}`);
      return res.json({ return_code: 1, return_message: 'Success.' }); // trả 1 để ZaloPay không retry
    }

    // Tạo booking thật
    const seatUnits  = JSON.parse(pending.seat_units  || '[]');
    const foodItems  = JSON.parse(pending.food_items  || '[]');

    const booking = await BookingModel.createUserBooking({
      userId:        Number(pending.user_id),
      showtimeId:    Number(pending.showtime_id),
      seatUnits,
      foodItems,
      paymentMethod: 'zalopay',
    });

    // Đánh dấu paid ngay + lưu app_trans_id
    await db.query(
      `UPDATE Orders
         SET status = 'confirmed', payment_status = 'paid', zalopay_trans_id = ?
       WHERE booking_code = ?`,
      [String(app_trans_id), String(booking.booking_code || '')],
    );

    // Cộng điểm (vì createUserBooking chỉ cộng khi cash/cashier)
    // Gọi confirmCardPayment tái dụng logic cộng điểm
    try {
      await BookingModel.confirmCardPayment({
        orderId: booking.booking_id,
        userId:  Number(pending.user_id),
      });
    } catch (pointsErr) {
      console.warn('[ZaloPay] Points award failed (non-critical):', pointsErr.message);
    }

    // Xóa pending data
    await db.query(`DELETE FROM Pending_Payments WHERE app_trans_id = ?`, [String(app_trans_id)]).catch(() => {});

    return res.json({ return_code: 1, return_message: 'Success.' });
  } catch (err) {
    console.error('[ZaloPay] Callback error:', err);
    return res.json({ return_code: -1, return_message: err.message });
  }
});

export default router;
