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
import { authMiddleware, selfOrAdminOnly } from '../../admin/middleware/authMiddleware.js';

const router = express.Router();

// ── Helper: format app_trans_id = YYMMDD_appId_timestamp ─────────────────────
function makeAppTransId(appId) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}_${appId}_${Date.now()}`;
}

// ── POST /:userId/payments/zalopay — Tạo đơn hàng ZaloPay ────────────────────
router.post('/:userId/payments/zalopay', authMiddleware, selfOrAdminOnly, async (req, res) => {
  try {
    const { amount, description, bookingCode, orderId: bookingId, preferredMethod } = req.body;

    const appId   = process.env.ZALOPAY_APP_ID   || '2553';
    const key1    = process.env.ZALOPAY_KEY1      || 'PcY4in5zKmuiveAc';
    const endpoint = process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/create';
    const callbackUrl  = process.env.ZALOPAY_CALLBACK_URL  || '';
    const redirectUrl  = process.env.ZALOPAY_REDIRECT_URL  || 'http://localhost:5173/payment/result';
    const frontendUrl  = process.env.FRONTEND_URL          || 'http://localhost:5173';

    const parsedAmount = Number(amount || 0);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ.' });
    }

    const appTransId = makeAppTransId(appId);
    const appTime    = Date.now();
    const appUser    = String(req.user?.id || req.params.userId || 'sweetstar-user');
    const note       = String(description || bookingCode || 'SWEETSTAR PAYMENT').trim();

    // embed_data: redirecturl + preferred_payment_method
    // preferredMethod: 'zalopay_wallet' | 'vietqr' | 'domestic_card' | 'international_card' | '' (all)
    const embedDataObj = {
      redirecturl: redirectUrl,
      ...(preferredMethod ? { preferred_payment_method: [preferredMethod] } : { preferred_payment_method: [] }),
    };
    const embedData = JSON.stringify(embedDataObj);

    const item = JSON.stringify([{
      itemid:       String(bookingCode || bookingId || appTransId),
      itemname:     note,
      itemprice:    parsedAmount,
      itemquantity: 1,
    }]);

    // MAC = HMAC-SHA256(key1, app_id|app_trans_id|app_user|amount|app_time|embed_data|item)
    const macData = `${appId}|${appTransId}|${appUser}|${parsedAmount}|${appTime}|${embedData}|${item}`;
    const mac = createHmac('sha256', key1).update(macData).digest('hex');

    const payload = {
      app_id:       Number(appId),
      app_user:     appUser,
      app_time:     appTime,
      amount:       parsedAmount,
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
      console.error('[ZaloPay] Create order failed:', result);
      return res.status(502).json({
        message: result?.return_message || 'ZaloPay không tạo được đơn hàng.',
        zlpError: result,
      });
    }

    // Lưu app_trans_id vào DB để sau này đối chiếu callback
    await db.query(
      `UPDATE Orders SET zalopay_trans_id = ? WHERE booking_code = ?`,
      [appTransId, String(bookingCode || '')],
    ).catch(() => {}); // không block nếu fail

    return res.json({
      orderUrl:     result.order_url     || '',
      qrCode:       result.qr_code       || '',
      appTransId,
      zpTransToken: result.zp_trans_token || '',
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

    const appId    = process.env.ZALOPAY_APP_ID     || '2553';
    const key1     = process.env.ZALOPAY_KEY1       || 'PcY4in5zKmuiveAc';
    const endpoint = process.env.ZALOPAY_QUERY_ENDPOINT || 'https://sb-openapi.zalopay.vn/v2/query';

    const macData = `${appId}|${app_trans_id}|${key1}`;
    const mac = createHmac('sha256', key1).update(macData).digest('hex');

    const response = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ app_id: Number(appId), app_trans_id, mac }),
    });

    const result = await response.json().catch(() => null);
    return res.json(result || { return_code: -1, return_message: 'Không có phản hồi.' });
  } catch (err) {
    console.error('[ZaloPay] Query order error:', err);
    return res.status(500).json({ message: err.message });
  }
});

// ── POST /payments/zalopay/callback — Nhận IPN từ ZaloPay Server ─────────────
// ZaloPay gọi endpoint này khi thanh toán thành công
// Không cần auth — nhưng phải verify MAC bằng key2
router.post('/payments/zalopay/callback', async (req, res) => {
  try {
    const key2 = process.env.ZALOPAY_KEY2 || 'kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz';
    const { data: dataStr, mac: receivedMac, type } = req.body;

    // Verify MAC
    const expectedMac = createHmac('sha256', key2).update(dataStr).digest('hex');
    if (expectedMac !== receivedMac) {
      console.warn('[ZaloPay] Callback MAC mismatch');
      return res.json({ return_code: -1, return_message: 'MAC không hợp lệ.' });
    }

    const callbackData = JSON.parse(dataStr);
    const { app_trans_id, app_id, amount } = callbackData;

    console.log(`[ZaloPay] ✅ Payment callback received — app_trans_id: ${app_trans_id}, amount: ${amount}`);

    // Cập nhật trạng thái đơn hàng sang confirmed/paid
    await db.query(
      `UPDATE Orders
         SET status = 'confirmed', payment_status = 'paid'
       WHERE zalopay_trans_id = ?
         AND status IN ('pending')`,
      [String(app_trans_id || '')],
    );

    return res.json({ return_code: 1, return_message: 'Success.' });
  } catch (err) {
    console.error('[ZaloPay] Callback error:', err);
    return res.json({ return_code: -1, return_message: err.message });
  }
});

export default router;
