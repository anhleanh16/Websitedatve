import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true'
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER || ''
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

let transporter = null

const hasSmtpConfig = () => Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && EMAIL_FROM)

const getTransporter = () => {
  if (transporter) return transporter
  if (!hasSmtpConfig()) return null

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  return transporter
}

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const toVnd = (value) => Number(value || 0).toLocaleString('vi-VN')

const formatDateTime = (dateLike) => {
  if (!dateLike) return 'Chưa xác định'
  const date = new Date(dateLike)
  if (Number.isNaN(date.getTime())) return 'Chưa xác định'
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const buildTicketEmailHtml = ({ booking, qrCidByCode }) => {
  const bookingCode = escapeHtml(booking.booking_code || '')
  const fullName = escapeHtml(booking.full_name || 'Bạn')
  const movieTitle = escapeHtml(booking.movie_title || 'Đang cập nhật')
  const cinemaName = escapeHtml(booking.cinema_name || 'Đang cập nhật')
  const roomName = escapeHtml(booking.room_name || 'Đang cập nhật')
  const showtime = escapeHtml(formatDateTime(booking.start_time))
  const total = toVnd(booking.total_price)

  const seats = Array.isArray(booking.seats) ? booking.seats : []
  const qrCodes = Array.isArray(booking.qr_codes) ? booking.qr_codes : []

  const qrItemsHtml = qrCodes
    .map((qrCode, index) => {
      const safeQr = escapeHtml(qrCode)
      const seatCode = escapeHtml(seats[index] || `Ghế ${index + 1}`)
      const cid = qrCidByCode.get(qrCode)
      if (!cid) return ''

      return `
        <div style="width:240px;display:inline-block;vertical-align:top;margin:10px;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#f8fafc;">
          <p style="margin:0 0 8px;font-size:13px;color:#111827;font-weight:700;">${seatCode}</p>
          <img src="cid:${cid}" alt="QR ${seatCode}" style="width:180px;height:180px;display:block;margin:0 auto 10px;border-radius:8px;background:#fff;" />
          <p style="margin:0;font-size:11px;line-height:1.5;color:#4b5563;word-break:break-all;">Mã QR: ${safeQr}</p>
        </div>
      `
    })
    .join('')

  return `
    <div style="margin:0;padding:0;background:#0b1220;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#f59e0b 0%,#ef4444 100%);padding:24px 28px;color:#ffffff;">
                  <p style="margin:0;font-size:12px;letter-spacing:1px;font-weight:700;text-transform:uppercase;opacity:0.95;">Sweetstar Movie</p>
                  <h1 style="margin:10px 0 0;font-size:24px;line-height:1.3;">Thanh toán thành công - Vé điện tử của bạn</h1>
                </td>
              </tr>

              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 14px;font-size:16px;color:#111827;">Xin chào ${fullName},</p>
                  <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">Cảm ơn bạn đã đặt vé tại Sweetstar Movie. Vui lòng đưa mã QR bên dưới tại quầy/soát vé để vào rạp nhanh chóng.</p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:18px;">
                    <tr>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:13px;color:#6b7280;">Mã đặt vé</td>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:14px;color:#111827;font-weight:700;text-align:right;">${bookingCode}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Phim</td>
                      <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${movieTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:13px;color:#6b7280;">Rạp / Phòng</td>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:14px;color:#111827;font-weight:600;text-align:right;">${cinemaName} - ${roomName}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;font-size:13px;color:#6b7280;">Suất chiếu</td>
                      <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;">${showtime}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:13px;color:#6b7280;">Tổng thanh toán</td>
                      <td style="padding:14px 16px;background:#f9fafb;font-size:14px;color:#dc2626;font-weight:700;text-align:right;">${total}đ</td>
                    </tr>
                  </table>

                  <div style="text-align:center;margin:0 0 18px;">${qrItemsHtml || '<p style="color:#6b7280;">Không có dữ liệu QR.</p>'}</div>

                  <p style="margin:0 0 10px;font-size:13px;color:#4b5563;line-height:1.6;">Mẹo: Bạn có thể vào mục Vé của tôi để xem lại vé bất cứ lúc nào.</p>
                  <p style="margin:0;">
                    <a href="${FRONTEND_URL}/profile" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Xem vé của tôi</a>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:14px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;text-align:center;">Email giao dịch tự động từ Sweetstar Movie. Vui lòng không trả lời trực tiếp email này.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `
}

const buildTicketEmailText = ({ booking }) => {
  const seats = Array.isArray(booking.seats) ? booking.seats.join(', ') : ''
  const qrCodes = Array.isArray(booking.qr_codes) ? booking.qr_codes.join('\n') : ''

  return [
    `Xin chào ${booking.full_name || 'bạn'},`,
    '',
    'Thanh toán vé của bạn đã thành công.',
    `Mã đặt vé: ${booking.booking_code || ''}`,
    `Phim: ${booking.movie_title || ''}`,
    `Rạp: ${booking.cinema_name || ''} - ${booking.room_name || ''}`,
    `Suất chiếu: ${formatDateTime(booking.start_time)}`,
    `Ghế: ${seats}`,
    `Tổng thanh toán: ${toVnd(booking.total_price)}đ`,
    '',
    'Mã QR vé:',
    qrCodes,
    '',
    `Xem vé của tôi: ${FRONTEND_URL}/profile`,
    '',
    'Sweetstar Movie Team',
  ].join('\n')
}

export const sendTicketQrEmail = async (booking) => {
  const toEmail = String(booking?.email || '').trim()
  if (!toEmail) return { sent: false, reason: 'missing_email' }

  const qrCodes = Array.isArray(booking?.qr_codes) ? booking.qr_codes.filter(Boolean) : []
  if (qrCodes.length === 0) return { sent: false, reason: 'missing_qr' }

  const mailTransporter = getTransporter()
  if (!mailTransporter) {
    throw new Error('Thiếu cấu hình SMTP để gửi email vé.')
  }

  const qrCidByCode = new Map()
  const attachments = []

  for (let i = 0; i < qrCodes.length; i += 1) {
    const qrValue = String(qrCodes[i])
    const cid = `ticket-qr-${booking.booking_id || 'order'}-${i}@sweetstar`
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 360,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })

    const base64 = qrDataUrl.split(',')[1] || ''
    if (!base64) continue

    qrCidByCode.set(qrValue, cid)
    attachments.push({
      filename: `qr-${i + 1}.png`,
      content: Buffer.from(base64, 'base64'),
      contentType: 'image/png',
      cid,
    })
  }

  if (attachments.length === 0) return { sent: false, reason: 'missing_qr_image' }

  await mailTransporter.sendMail({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `Vé điện tử ${booking.booking_code || ''} - Sweetstar Movie`,
    text: buildTicketEmailText({ booking }),
    html: buildTicketEmailHtml({ booking, qrCidByCode }),
    attachments,
  })

  return { sent: true, ticketCount: attachments.length }
}
