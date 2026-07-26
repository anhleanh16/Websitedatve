/**
 * Trang /payment/result
 * ZaloPay Gateway redirect về đây sau khi user thanh toán xong.
 *
 * Query params từ ZaloPay:
 *   appid, apptransid, pmcid, bankcode, amount, discountamount, status, checksum
 *
 * status = 1 → thành công | -49 / khác → thất bại / hủy
 */

import { useEffect, useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaHome, FaUser } from 'react-icons/fa'
import { userBookingService } from '../../services/userApi'
import './PaymentResult.css'

export default function PaymentResult() {
  const location = useLocation()
  const navigate = useNavigate()

  const [status, setStatus]   = useState('loading') // loading | success | fail
  const [pending, setPending] = useState(null)
  const [queryResult, setQueryResult] = useState(null)

  useEffect(() => {
    // Đọc query params từ ZaloPay redirect
    const params = new URLSearchParams(location.search)
    const zlpStatus    = params.get('status')
    const appTransId   = params.get('apptransid')
    const amount       = params.get('amount')

    // Đọc pending data từ sessionStorage
    let savedPending = null
    try {
      const raw = sessionStorage.getItem('zlp_pending')
      if (raw) {
        savedPending = JSON.parse(raw)
        sessionStorage.removeItem('zlp_pending')
      }
    } catch (_) {}
    setPending(savedPending)

    if (!zlpStatus && !appTransId) {
      // Không có params → redirect thẳng → về trang chủ
      navigate('/', { replace: true })
      return
    }

    if (zlpStatus === '1') {
      setStatus('success')
      return
    }

    // status !== '1' → query lại để chắc chắn
    if (appTransId) {
      userBookingService.queryZaloPayOrder(appTransId)
        .then((result) => {
          setQueryResult(result)
          // return_code = 1 → đã thanh toán thành công
          setStatus(result?.return_code === 1 ? 'success' : 'fail')
        })
        .catch(() => {
          setStatus(zlpStatus === '1' ? 'success' : 'fail')
        })
    } else {
      setStatus('fail')
    }
  }, [location.search, navigate])

  const params = new URLSearchParams(location.search)
  const amountRaw = params.get('amount')
  const appTransId = params.get('apptransid')
  const bankCode = params.get('bankcode')

  const booking    = pending?.createdBooking
  const finalTotal = pending?.finalTotal || Number(amountRaw || 0)

  if (status === 'loading') {
    return (
      <div className="pr-page">
        <div className="pr-loading">
          <FaSpinner className="pr-spinner" />
          <p>Đang xác nhận kết quả thanh toán…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="pr-page">
      <div className={`pr-card ${status}`}>
        {/* Icon */}
        <div className={`pr-icon-ring ${status}`}>
          {status === 'success'
            ? <FaCheckCircle className="pr-icon success" />
            : <FaTimesCircle className="pr-icon fail" />
          }
        </div>

        {/* Tiêu đề */}
        <h1 className="pr-title">
          {status === 'success' ? 'Thanh toán thành công!' : 'Thanh toán không thành công'}
        </h1>
        <p className="pr-sub">
          {status === 'success'
            ? 'Đơn đặt vé của bạn đã được xác nhận. Vé điện tử sẽ gửi qua email.'
            : 'Giao dịch bị huỷ hoặc thất bại. Bạn có thể thử lại.'}
        </p>

        {/* Thông tin đơn */}
        {booking && (
          <div className="pr-ticket">
            {booking.booking_code && (
              <div className="pr-row">
                <span>Mã đặt vé</span>
                <strong className="pr-code">{booking.booking_code}</strong>
              </div>
            )}
            {pending?.movieTitle && (
              <div className="pr-row"><span>Phim</span><strong>{pending.movieTitle}</strong></div>
            )}
            {pending?.cinema && (
              <div className="pr-row"><span>Rạp</span><strong>{pending.cinema}</strong></div>
            )}
            {pending?.day && (
              <div className="pr-row"><span>Ngày</span><strong>{pending.day}</strong></div>
            )}
            {pending?.time && (
              <div className="pr-row"><span>Suất chiếu</span><strong>{pending.time}</strong></div>
            )}
            {pending?.displaySeats?.length > 0 && (
              <div className="pr-row"><span>Ghế</span><strong>{pending.displaySeats.join(', ')}</strong></div>
            )}
            {appTransId && (
              <div className="pr-row"><span>Mã GD ZaloPay</span><strong className="pr-trans">{appTransId}</strong></div>
            )}
            <div className="pr-divider" />
            <div className="pr-row total">
              <span>Tổng thanh toán</span>
              <strong className="pr-amount">{Number(finalTotal).toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>
        )}

        {/* Điểm thưởng nếu thành công */}
        {status === 'success' && Number(pending?.pointsAwarded || 0) > 0 && (
          <div className="pr-points">
            ⭐ Bạn nhận được <strong>+{Number(pending.pointsAwarded).toLocaleString('vi-VN')} điểm</strong>
          </div>
        )}

        {/* Actions */}
        <div className="pr-actions">
          {status === 'success' ? (
            <>
              <Link to="/profile" className="pr-btn primary"><FaUser /> Xem vé của tôi</Link>
              <Link to="/"        className="pr-btn ghost"><FaHome /> Trang chủ</Link>
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
