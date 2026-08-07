/**
 * Trang /payment/result
 * Hiển thị sau khi user mở ZaloPay trong tab mới.
 * User bấm "Tôi đã thanh toán" → app verify với ZaloPay server → tạo booking.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome, FaUser } from 'react-icons/fa'
import { userBookingService } from '../../services/userApi'
import './PaymentResult.css'

export default function PaymentResult() {
  const location = useLocation()
  const navigate = useNavigate()

  const [status, setStatus]           = useState('verifying') // verifying | waiting | success | fail
  const [pending, setPending]         = useState(null)
  const [booking, setBooking]         = useState(null)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')
  const hasStartedVerification = useRef(false)
  const params = new URLSearchParams(location.search)
  const returnedAppTransId = params.get('apptransid') || params.get('app_trans_id') || ''
  const amountRaw = params.get('amount')

  const verifyPayment = async (appTransId, { showLoading = false } = {}) => {
    if (!appTransId) return

    if (showLoading) setStatus('verifying')
    setChecking(true)
    setCheckMessage('')

    try {
      const result = await userBookingService.confirmZaloPayOrder(appTransId)
      if (result?.success) {
        setBooking(result.booking || null)
        setPointsAwarded(result.booking?.pointsAwarded || 0)
        sessionStorage.removeItem('zlp_pending')
        setStatus('success')
        return
      }

      setStatus('waiting')
      setCheckMessage('ZaloPay đã xác nhận thanh toán. Hệ thống đang hoàn tất tạo vé, vui lòng đợi hoặc kiểm tra lại.')
    } catch {
      setStatus('waiting')
      setCheckMessage('ZaloPay đã xác nhận thanh toán. Hệ thống đang đồng bộ giao dịch, vui lòng kiểm tra lại sau vài giây.')
    } finally {
      setChecking(false)
    }
  }

  const checkPaymentStatus = async (appTransId) => {
    if (!appTransId) return
    setChecking(true)
    setCheckMessage('')
    try {
      const result = await userBookingService.queryZaloPayOrder(appTransId)
      if (Number(result?.return_code) === 1) {
        await verifyPayment(appTransId, { showLoading: true })
        return
      }
      setStatus(Number(result?.return_code) === 2 ? 'waiting' : 'fail')
      setCheckMessage(result?.return_message || 'ZaloPay chưa xác nhận giao dịch.')
    } catch {
      setStatus('waiting')
      setCheckMessage('Chưa thể kiểm tra ZaloPay. Vui lòng thử lại sau ít phút.')
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (hasStartedVerification.current) return
    hasStartedVerification.current = true

    // Đọc pending data từ sessionStorage
    let savedPending = null
    try {
      const raw = sessionStorage.getItem('zlp_pending')
      if (raw) {
        savedPending = JSON.parse(raw)
        setPending(savedPending)
      } else if (returnedAppTransId) {
        savedPending = { appTransId: returnedAppTransId, finalTotal: Number(amountRaw || 0) }
        setPending(savedPending)
      } else {
        navigate('/', { replace: true })
        return
      }
    } catch (_) {
      navigate('/', { replace: true })
      return
    }

    // Demo: tự động confirm luôn khi vào trang
    const appTransId = returnedAppTransId || savedPending?.appTransId
    if (appTransId) {
      checkPaymentStatus(appTransId)
    }
  }, [navigate])

  const finalTotal = pending?.finalTotal || Number(amountRaw || 0)

  // --- Loading / Verifying ---
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
            : status === 'waiting'
              ? <FaSpinner className="pr-icon pr-spinner" />
              : <FaTimesCircle className="pr-icon fail" />
          }
        </div>
        <h1 className="pr-title">
          {status === 'success' ? 'Thanh toán thành công!' : status === 'waiting' ? 'Đang chờ thanh toán' : 'Thanh toán không thành công'}
        </h1>
        <p className="pr-sub">
          {status === 'success'
            ? 'Đơn đặt vé của bạn đã được xác nhận. Vé điện tử sẽ gửi qua email.'
            : status === 'waiting'
              ? 'Hãy hoàn tất thanh toán trên ZaloPay, sau đó kiểm tra lại.'
              : 'Giao dịch bị huỷ hoặc thất bại. Bạn có thể thử lại.'}
        </p>

        {status !== 'success' && checkMessage && (
          <div className="pr-error-msg">{checkMessage}</div>
        )}

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
              <button
                className={`pr-btn primary${checking ? ' disabled' : ''}`}
                onClick={() => checkPaymentStatus(pending?.appTransId)}
                disabled={checking || !pending?.appTransId}
              >
                {checking ? <><FaSpinner className="pr-spin-sm" /> Đang kiểm tra...</> : 'Kiểm tra thanh toán'}
              </button>
              <button className="pr-btn primary" onClick={() => navigate(-2)}>Thử lại</button>
              <Link to="/" className="pr-btn ghost"><FaHome /> Trang chủ</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
