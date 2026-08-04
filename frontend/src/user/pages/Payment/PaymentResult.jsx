/**
 * Trang /payment/result
 * Hiển thị sau khi user mở ZaloPay trong tab mới.
 * User bấm "Tôi đã thanh toán" → app verify với ZaloPay server → tạo booking.
 */

import { useEffect, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome, FaUser } from 'react-icons/fa'
import { userBookingService } from '../../services/userApi'
import './PaymentResult.css'

export default function PaymentResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const DEMO_AUTO_CONFIRM_SECONDS = 15

  const [status, setStatus]           = useState('waiting') // waiting | verifying | success | fail
  const [pending, setPending]         = useState(null)
  const [booking, setBooking]         = useState(null)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(DEMO_AUTO_CONFIRM_SECONDS)

  useEffect(() => {
    // Đọc pending data từ sessionStorage
    let savedPending = null
    try {
      const raw = sessionStorage.getItem('zlp_pending')
      if (raw) {
        savedPending = JSON.parse(raw)
        setPending(savedPending)
      } else {
        navigate('/', { replace: true })
        return
      }
    } catch (_) {
      navigate('/', { replace: true })
      return
    }

    // Demo: tự động confirm sau 15 giây khi vào trang
    if (savedPending?.appTransId) {
      setStatus('waiting')
      setSecondsLeft(DEMO_AUTO_CONFIRM_SECONDS)

      const countdownTimer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const autoConfirmTimer = setTimeout(() => {
        setStatus('verifying')
        userBookingService.confirmZaloPayOrder(savedPending.appTransId)
          .then((result) => {
            if (result?.success) {
              setBooking(result.booking || null)
              setPointsAwarded(result.booking?.pointsAwarded || 0)
              sessionStorage.removeItem('zlp_pending')
              setStatus('success')
            } else {
              setStatus('fail')
            }
          })
          .catch(() => setStatus('fail'))
      }, DEMO_AUTO_CONFIRM_SECONDS * 1000)

      return () => {
        clearInterval(countdownTimer)
        clearTimeout(autoConfirmTimer)
      }
    }
  }, [navigate])

  const params = new URLSearchParams(location.search)
  const amountRaw = params.get('amount')
  const finalTotal = pending?.finalTotal || Number(amountRaw || 0)

  // --- Waiting / Verifying ---
  if (status === 'waiting') {
    return (
      <div className="pr-page">
        <div className="pr-loading">
          <FaSpinner className="pr-spinner" />
          <p>Đây là bản demo. Hệ thống sẽ tự động xác nhận thanh toán sau <b>{secondsLeft}s</b>.</p>
        </div>
      </div>
    )
  }

  if (status === 'verifying') {
    return (
      <div className="pr-page">
        <div className="pr-loading">
          <FaSpinner className="pr-spinner" />
          <p>Đang xử lý đơn hàng…</p>
        </div>
      </div>
    )
  }

  // --- Kết quả ---
  return (
    <div className="pr-page">
      <div className={`pr-card ${status}`}>
        <div className={`pr-icon-ring ${status}`}>
          {status === 'success'
            ? <FaCheckCircle className="pr-icon success" />
            : <FaTimesCircle className="pr-icon fail" />
          }
        </div>
        <h1 className="pr-title">
          {status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
        </h1>
        <p className="pr-sub">
          {status === 'success'
            ? 'Đơn đặt vé của bạn đã được xác nhận. Vé điện tử sẽ gửi qua email.'
            : 'Giao dịch bị huỷ hoặc thất bại. Bạn có thể thử lại.'}
        </p>

        {booking && (
          <div className="pr-ticket">
            {booking.booking_code && <div className="pr-row"><span>Mã đặt vé</span><strong className="pr-code">{booking.booking_code}</strong></div>}
            {pending?.movieTitle  && <div className="pr-row"><span>Phim</span><strong>{pending.movieTitle}</strong></div>}
            {pending?.cinema      && <div className="pr-row"><span>Rạp</span><strong>{pending.cinema}</strong></div>}
            {pending?.day         && <div className="pr-row"><span>Ngày</span><strong>{pending.day}</strong></div>}
            {pending?.time        && <div className="pr-row"><span>Suất chiếu</span><strong>{pending.time}</strong></div>}
            {pending?.displaySeats?.length > 0 && <div className="pr-row"><span>Ghế</span><strong>{pending.displaySeats.join(', ')}</strong></div>}
            <div className="pr-divider" />
            <div className="pr-row total">
              <span>Tổng thanh toán</span>
              <strong className="pr-amount">{Number(finalTotal).toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>
        )}

        {status === 'success' && Number(pointsAwarded || 0) > 0 && (
          <div className="pr-points">
            ⭐ Bạn nhận được <strong>+{Number(pointsAwarded).toLocaleString('vi-VN')} điểm</strong>
          </div>
        )}

        <div className="pr-actions">
          {status === 'success' ? (
            <>
              <Link to="/profile" className="pr-btn primary"><FaUser /> Xem vé của tôi</Link>
              <Link to="/" className="pr-btn ghost"><FaHome /> Trang chủ</Link>
            </>
          ) : (
            <>
              <button className="pr-btn primary" onClick={() => navigate(-2)}>Thử lại</button>
              <Link to="/" className="pr-btn ghost"><FaHome /> Trang chủ</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
