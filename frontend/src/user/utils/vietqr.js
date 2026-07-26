/**
 * VietQR helper — dùng img.vietqr.io (public API, không cần key)
 *
 * URL format:
 *   https://img.vietqr.io/image/{bankBin}-{accountNumber}-{template}.png
 *     ?amount={amount}
 *     &addInfo={note}
 *     &accountName={name}
 *
 * Khi quét bằng bất kỳ app ngân hàng VN / ZaloPay / MoMo:
 *   ✅ Tự điền số tài khoản
 *   ✅ Tự điền số tiền
 *   ✅ Tự điền nội dung chuyển khoản
 */

// ── Bank BIN map (NAPAS) ──────────────────────────────────────────────────────
export const VIETQR_BANK_BIN = {
  Vietcombank:      '970436',
  Techcombank:      '970407',
  BIDV:             '970418',
  Agribank:         '970405',
  VPBank:           '970432',
  'MB Bank':        '970422',
  Sacombank:        '970403',
  VietinBank:       '970415',
  ACB:              '970416',
  TPBank:           '970423',
  SHB:              '970443',
  HDBank:           '970437',
  OCB:              '970448',
  SeABank:          '970440',
  MSB:              '970426',
  LienVietPostBank: '970449',
  NamABank:         '970428',
  VietABank:        '970427',
  BacABank:         '970409',
  PVcomBank:        '970412',
}

/**
 * Tạo URL ảnh QR từ img.vietqr.io — chuẩn NAPAS/VietQR, không cần API key.
 *
 * @param {object} opts
 * @param {string} opts.bankBin       - BIN ngân hàng, e.g. "970436"
 * @param {string} opts.accountNumber - Số tài khoản người nhận
 * @param {number} opts.amount        - Số tiền VND (0 = không điền sẵn)
 * @param {string} opts.addInfo       - Nội dung chuyển khoản
 * @param {string} opts.accountName   - Tên chủ tài khoản
 * @param {string} [opts.template]    - "compact" | "compact2" | "qr_only" (mặc định "compact2")
 * @returns {string} URL ảnh PNG có thể dùng trực tiếp trong <img src>
 */
export function buildVietQRImageUrl({
  bankBin,
  accountNumber,
  amount = 0,
  addInfo = '',
  accountName = '',
  template = 'compact2',
}) {
  if (!bankBin || !accountNumber) return ''

  const base = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${template}.png`

  const params = new URLSearchParams()
  if (amount > 0) params.set('amount', String(Math.round(amount)))
  if (addInfo)    params.set('addInfo', addInfo)
  if (accountName) params.set('accountName', accountName)

  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/**
 * Tạo URL ảnh QR chỉ có mã QR (không kèm thông tin ngân hàng xung quanh).
 * Dùng template "qr_only" — nhỏ gọn, phù hợp embed vào UI.
 */
export function buildVietQROnlyImageUrl(opts) {
  return buildVietQRImageUrl({ ...opts, template: 'qr_only' })
}
