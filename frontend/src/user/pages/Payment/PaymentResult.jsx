/**
 * Trang /payment/result
 * Hiển thị QR ZaloPay và tự kiểm tra giao dịch cho đến khi tạo booking thành công.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome, FaUser } from 'react-icons/fa'
import QRCode from 'qrcode'
import { userBookingService } from '../../services/userApi'
import './PaymentResult.css'

export default function PaymentResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const returnedAppTransId = params.get('apptransid') || params.get('app_trans_id') || ''
  const amountRaw = params.get('amount')

  const [status, setStatus]           = useState('verifying') // verifying | waiting | success | fail
  const [pending] = useState(() => {
    try {
      if (location.state?.pendingPayment?.appTransId) return location.state.pendingPayment

      const raw = sessionStorage.getItem('zlp_pending')
      if (raw) return JSON.parse(raw)
      if (returnedAppTransId) {
        return { appTransId: returnedAppTransId, finalTotal: Number(amountRaw || 0) }
      }
    } catch {
      return null
    }
    return null
  })
  const [booking, setBooking]         = useState(null)
  const [pointsAwarded, setPointsAwarded] = useState(0)
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')
  const [qrImageUrl, setQrImageUrl] = useState('')

  const verifyPayment = useCallback(async (appTransId, { showLoading = false } = {}) => {
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
  }, [])

  const checkPaymentStatus = useCallback(async (appTransId) => {
    if (!appTransId) return
    setChecking(true)
    setCheckMessage('')
    try {
      const result = await userBookingService.queryZaloPayOrder(appTransId)
      if (Number(result?.return_code) === 1) {
        await verifyPayment(appTransId, { showLoading: true })
        return
      }
      const isPending = Number(result?.return_code) === 3
      setStatus(isPending ? 'waiting' : 'fail')
      setCheckMessage(isPending ? '' : (result?.return_message || 'ZaloPay chưa xác nhận giao dịch.'))
    } catch {
      setStatus('waiting')
      setCheckMessage('Chưa thể kiểm tra ZaloPay. Vui lòng thử lại sau ít phút.')
    } finally {
      setChecking(false)
    }
  }, [verifyPayment])

  useEffect(() => {
    if (!pending?.appTransId) {
      navigate('/', { replace: true })
      return undefined
    }

    // Dùng timer để tương thích React Strict Mode: lần effect thử đầu tiên có
    // thể bị cleanup ngay trong môi trường development, lần kế tiếp vẫn phải
    // được phép chạy xác minh giao dịch.
    const timer = window.setTimeout(() => {
      checkPaymentStatus(returnedAppTransId || pending.appTransId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [checkPaymentStatus, navigate, pending, returnedAppTransId])

  useEffect(() => {
    if (!pending?.qrCode) return undefined

    let active = true
    QRCode.toDataURL(pending.qrCode, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    })
      .then((url) => { if (active) setQrImageUrl(url) })
      .catch(() => { if (active) setCheckMessage('Không thể hiển thị mã QR ZaloPay. Vui lòng thử tạo lại giao dịch.') })

    return () => { active = false }
  }, [pending?.qrCode])

  useEffect(() => {
    if (status !== 'waiting' || !pending?.appTransId) return undefined

    const timer = window.setInterval(() => {
      if (!checking) checkPaymentStatus(pending.appTransId)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [checkPaymentStatus, checking, pending?.appTransId, status])

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

        {status === 'waiting' && pending?.method === 'zalopay' && (
          <div className="pr-zalopay-qr">
            <div className="pr-zalopay-label">ZaloPay</div>
            <h2>Quét mã để thanh toán</h2>
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="Mã QR thanh toán ZaloPay" />
            ) : (
              <div className="pr-qr-loading"><FaSpinner className="pr-spinner" /></div>
            )}
            <strong>{Number(finalTotal).toLocaleString('vi-VN')}đ</strong>
            <p>Mở ZaloPay → chọn “Quét mã” → quét mã QR bên trên và xác nhận thanh toán.</p>
            {pending?.orderUrl && (
              <a className="pr-open-zalopay" href={pending.orderUrl}>Mở ứng dụng ZaloPay</a>
            )}
          </div>
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
