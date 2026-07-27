import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FaClock, FaStar, FaTicketAlt, FaHome, FaUser } from 'react-icons/fa'
import './PaymentPending.css'
import { buildVietQRImageUrl, buildVietQROnlyImageUrl, VIETQR_BANK_BIN } from '../../utils/vietqr'

/**
 * Trang "Đang chờ xử lý" hiển thị ngay sau khi user bấm "Thanh toán".
 * Đơn đã được tạo trong DB với status = 'pending', đang chờ xác nhận thanh toán.
 */
export default function PaymentPending() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    createdBooking = null,
    movieTitle = '',
    cinema = '',
    day = '',
    time = '',
    displaySeats = [],
    groupedFoodItems = [],
    finalTotal = 0,
    paymentLink = '',
    vietQROnlyUrl: passedVietQROnlyUrl = '',
    bankTransferNote = '',
    method = '',
    selectedBank = 'Vietcombank',
    accountNumber = '0328959755',
    accountName = 'CONG TY SWEETSTAR',
    pointsAwarded = 0,
    pointsBalance = 0,
    cardSuccess = false,
    currentUserId = null,
  } = location.state ?? {}

  // Tạo lại QR nếu không được pass (fallback)
  const vietQRImageUrl = passedVietQROnlyUrl || buildVietQROnlyImageUrl({
    bankBin: VIETQR_BANK_BIN[selectedBank] || VIETQR_BANK_BIN['Vietcombank'],
    accountNumber,
    amount: finalTotal,
    addInfo: bankTransferNote,
    accountName,
  })

  // Nếu không có booking (user truy cập thẳng URL), redirect về trang chủ
  useEffect(() => {
    if (!createdBooking?.booking_code) {
      navigate('/', { replace: true })
    }
  }, [createdBooking, navigate])

  // Countdown 5 phút (300s) — thời gian hệ thống giữ ghế
  const [secondsLeft, setSecondsLeft] = useState(300)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  // Demo: sau 15 giây tự động chuyển sang trạng thái thành công + cập nhật DB
  const [autoConfirmed, setAutoConfirmed] = useState(cardSuccess)
  useEffect(() => {
    if (cardSuccess || autoConfirmed) return
    const timer = setTimeout(async () => {
      // Gọi API mark order confirmed/paid trong DB
      const orderId = createdBooking?.booking_id ?? createdBooking?.id
      const userId  = currentUserId ?? createdBooking?.user_id
      if (orderId && userId) {
        try {
          const token = localStorage.getItem('token')
          await fetch(`/api/user/${userId}/bookings/${orderId}/confirm-card`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token || ''}`,
            },
          })
        } catch (_) {
          // non-critical — UI vẫn chuyển thành công
        }
      }
      setAutoConfirmed(true)
    }, 15000)
    return () => clearTimeout(timer)
  }, [cardSuccess, autoConfirmed, createdBooking, currentUserId])

  const isSuccess = cardSuccess || autoConfirmed

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdownLabel = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const expired = secondsLeft <= 0

  const buildFoodLabel = (item) => {
    const parts = [`${item.quantity}x ${item.name}`]
    if (item.popcornType) parts.push(item.popcornType)
    if (item.drinkType) parts.push(item.drinkType)
    return parts.join(' • ')
  }

  if (!createdBooking?.booking_code) return null

  return (
    <div className="pp-page">
      {/* ── Header trạng thái ── */}
      <div className={`pp-status-banner ${isSuccess ? 'success' : expired ? 'expired' : ''}`}>
        <div className="pp-status-icon-ring">
          {isSuccess ? (
            <span className="pp-status-icon" style={{ fontSize: '2rem' }}>✅</span>
          ) : expired ? (
            <FaClock className="pp-status-icon expired-icon" />
          ) : (
            <FaClock className="pp-status-icon" />
          )}
        </div>
        <div className="pp-status-text">
          <h1>{isSuccess ? 'Thanh toán thành công!' : expired ? 'Đơn hàng đã hết hạn' : 'Đang chờ xử lý'}</h1>
          <p>
            {isSuccess
              ? 'Đơn đặt vé của bạn đã được xác nhận. Vé điện tử sẽ gửi vào email của bạn trong vài phút.'
              : expired
              ? 'Đơn hàng đã bị huỷ do hết thời gian xác nhận thanh toán.'
              : 'Đơn đặt vé của bạn đã được tạo thành công. Vui lòng hoàn tất thanh toán trong thời gian quy định.'}
          </p>
        </div>
      </div>

      {/* ── Countdown — chỉ hiện khi chờ và chưa hết hạn ── */}
      {!isSuccess && !expired && (
        <div className="pp-countdown-row">
          <FaClock className="pp-countdown-icon" />
          <span>Ghế được giữ trong</span>
          <span className={`pp-countdown-timer ${secondsLeft <= 60 ? 'urgent' : ''}`}>
            {countdownLabel}
          </span>
        </div>
      )}

      <div className="pp-layout">
        {/* ── Ticket summary ── */}
        <div className="pp-ticket-card">
          <div className="pp-ticket-header">
            <FaTicketAlt className="pp-ticket-icon" />
            <span>Thông tin vé</span>
          </div>

          {createdBooking.booking_code && (
            <div className="pp-ticket-row highlight">
              <span>Mã đặt vé</span>
              <strong className="pp-booking-code">{createdBooking.booking_code}</strong>
            </div>
          )}
          <div className="pp-ticket-row">
            <span>Phim</span>
            <strong>{movieTitle}</strong>
          </div>
          <div className="pp-ticket-row">
            <span>Rạp</span>
            <strong>{cinema}</strong>
          </div>
          <div className="pp-ticket-row">
            <span>Ngày</span>
            <strong>{day}</strong>
          </div>
          <div className="pp-ticket-row">
            <span>Suất chiếu</span>
            <strong>{time}</strong>
          </div>
          <div className="pp-ticket-row">
            <span>Ghế</span>
            <strong>{displaySeats.join(', ')}</strong>
          </div>

          {groupedFoodItems.length > 0 && (
            <>
              {groupedFoodItems.map((item) => (
                <div className="pp-ticket-row" key={`${item.key}-${item.quantity}`}>
                  <span>{item.category === 'single' ? 'Món thêm' : 'Combo'}</span>
                  <strong>{buildFoodLabel(item)}</strong>
                </div>
              ))}
            </>
          )}

          <div className="pp-ticket-divider">
            <span className="pp-notch left" />
            <span className="pp-dashed" />
            <span className="pp-notch right" />
          </div>

          <div className="pp-ticket-row total-row">
            <span>Tổng thanh toán</span>
            <strong className="pp-final-price">{Number(finalTotal).toLocaleString('vi-VN')}đ</strong>
          </div>

          {/* Trạng thái đơn */}
          <div className="pp-status-badge-row">
            <span className={`pp-status-badge ${isSuccess ? 'confirmed' : expired ? 'cancelled' : 'pending'}`}>
              {isSuccess ? '✅ Đã thanh toán' : expired ? '⛔ Đã huỷ' : '🕐 Chờ xác nhận'}
            </span>
          </div>
        </div>

        {/* ── Hướng dẫn thanh toán ── */}
        {!expired && (
          <div className="pp-right-col">
            {/* QR / link thanh toán — chỉ hiện cho banking khi chưa confirm */}
            {!isSuccess && (method === 'banking' || vietQRImageUrl) && (
              <div className="pp-qr-card">
                <h3>Quét mã VietQR để chuyển khoản</h3>
                <img
                  className="pp-qr-image"
                  src={vietQRImageUrl}
                  alt="VietQR - quét để chuyển khoản"
                />
                <div className="pp-vietqr-badge">VietQR</div>
                <div className="pp-qr-info-rows">
                  <div className="pp-qr-info-row"><span>STK</span><strong>{accountNumber}</strong></div>
                  <div className="pp-qr-info-row"><span>Số tiền</span><strong className="pp-qr-amount">{Number(finalTotal).toLocaleString('vi-VN')}đ</strong></div>
                  <div className="pp-qr-info-row"><span>Nội dung</span><strong>{bankTransferNote}</strong></div>
                </div>
                <p className="pp-qr-note">Mở app ngân hàng → Quét QR → Tự điền đầy đủ</p>
                {paymentLink && (
                  <a className="pp-pay-link" href={paymentLink} target="_blank" rel="noreferrer">
                    Mở link thanh toán →
                  </a>
                )}
              </div>
            )}

            {/* Hướng dẫn chung */}
            <div className="pp-guide-card">
              <h3>Hướng dẫn</h3>
              <ol className="pp-guide-list">
                {isSuccess ? (
                  <>
                    <li>Thanh toán của bạn đã được xác nhận thành công</li>
                    <li>Vé điện tử sẽ gửi vào email của bạn trong vài phút</li>
                    <li>Kiểm tra mục "Vé của tôi" trong trang cá nhân</li>
                    <li>Mang mã QR đến rạp để check-in</li>
                  </>
                ) : method === 'banking' ? (
                  <>
                    <li>Quét mã QR hoặc chuyển khoản theo thông tin bên trên</li>
                    <li>Đảm bảo nhập đúng nội dung chuyển khoản: <strong>{bankTransferNote}</strong></li>
                    <li>Giao dịch được xác nhận tự động trong vài phút</li>
                    <li>Vé điện tử sẽ gửi vào email của bạn</li>
                  </>
                ) : method === 'zalopay' ? (
                  <>
                    <li>Mở ứng dụng ZaloPay, chọn "Quét mã"</li>
                    <li>Quét mã QR ở trên và xác nhận số tiền</li>
                    <li>Giao dịch sẽ được xác nhận ngay lập tức</li>
                    <li>Vé điện tử gửi qua email trong 5 phút</li>
                  </>
                ) : (
                  <>
                    <li>Hoàn tất thanh toán theo phương thức đã chọn</li>
                    <li>Giao dịch được xác nhận trong vài phút</li>
                    <li>Vé điện tử sẽ gửi vào email của bạn</li>
                    <li>Kiểm tra mục "Vé của tôi" trong trang cá nhân</li>
                  </>
                )}
              </ol>
            </div>

            {/* Điểm tích luỹ */}
            {Number(pointsAwarded || 0) > 0 && (
              <div className="pp-points-banner">
                <FaStar className="pp-points-icon" />
                <div>
                  <div className="pp-points-title">
                    {isSuccess ? 'Điểm đã được cộng vào tài khoản' : 'Điểm sẽ được cộng sau khi xác nhận'}
                  </div>
                  <div className="pp-points-value">+{Number(pointsAwarded).toLocaleString('vi-VN')} điểm</div>
                  {Number(pointsBalance || 0) > 0 && (
                    <div className="pp-points-sub">Tổng điểm hiện tại: {Number(pointsBalance).toLocaleString('vi-VN')} điểm</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Actions ── */}
      <div className="pp-actions">
        <Link to="/profile" className="pp-btn-profile">
          <FaUser /> Xem vé của tôi
        </Link>
        <Link to="/" className="pp-btn-home">
          <FaHome /> Về trang chủ
        </Link>
        {expired && (
          <button className="pp-btn-retry" onClick={() => navigate(-2)}>
            Đặt vé lại
          </button>
        )}
      </div>
    </div>
  )
}
