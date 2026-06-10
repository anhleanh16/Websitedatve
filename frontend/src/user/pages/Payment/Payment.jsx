import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import {
  FaCreditCard, FaUniversity, FaWallet, FaMobileAlt,
  FaLock, FaCheckCircle, FaTicketAlt, FaTag, FaChevronDown, FaChevronUp
} from 'react-icons/fa'
import './Payment.css'

const PAYMENT_METHODS = [
  {
    id: 'card',
    icon: <FaCreditCard />,
    label: 'Thẻ tín dụng / Ghi nợ',
    desc: 'Visa, Mastercard, JCB',
    badges: ['VISA', 'MC', 'JCB'],
  },
  {
    id: 'banking',
    icon: <FaUniversity />,
    label: 'Chuyển khoản ngân hàng',
    desc: 'Vietcombank, Techcombank, BIDV...',
    badges: ['VCB', 'TCB', 'BIDV'],
  },
  {
    id: 'momo',
    icon: <FaMobileAlt />,
    label: 'Ví MoMo',
    desc: 'Thanh toán nhanh qua MoMo',
    badges: ['MoMo'],
    popular: true,
  },
]

const BANKS = [
  'Vietcombank', 'Techcombank', 'BIDV', 'Agribank', 'VPBank', 'MB Bank', 'Sacombank',
]

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    cinema = 'Lunexa Movix Đà Nẵng',
    day = 'Hôm nay',
    time = '10:00 - 2D',
    selectedSeats = ['B3', 'B4'],
    comboCounts = { couple: 1, friends: 0, family: 0 },
    total = 310000,
  } = location.state ?? {}

  const [method, setMethod] = useState('momo')
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [showOrderDetail, setShowOrderDetail] = useState(true)
  const [cardInfo, setCardInfo] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [selectedBank, setSelectedBank] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)

  const discount = promoApplied ? Math.round(total * 0.1) : 0
  const serviceFee = 5000
  const finalTotal = total + serviceFee - discount

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'LUNEXA10') {
      setPromoApplied(true)
      setPromoError('')
    } else {
      setPromoError('Mã không hợp lệ hoặc đã hết hạn')
      setPromoApplied(false)
    }
  }

  const handlePay = () => {
    if (!agreed) return
    setProcessing(true)
    setTimeout(() => {
      setProcessing(false)
      setPaid(true)
    }, 2200)
  }

  /* ── Success screen ── */
  if (paid) {
    return (
      <div className="payment-page">
        <div className="payment-success">
          <div className="success-icon-ring">
            <FaCheckCircle className="success-icon" />
          </div>
          <h2>Thanh toán thành công!</h2>
          <p>Vé của bạn đã được xác nhận. Kiểm tra email để nhận mã QR.</p>

          <div className="success-ticket">
            <div className="success-ticket-row">
              <span>Phim</span>
              <strong>Doraemon: Cuộc chiến vũ trụ tí hon</strong>
            </div>
            <div className="success-ticket-row">
              <span>Rạp</span>
              <strong>{cinema}</strong>
            </div>
            <div className="success-ticket-row">
              <span>Ngày</span>
              <strong>{day}</strong>
            </div>
            <div className="success-ticket-row">
              <span>Suất chiếu</span>
              <strong>{time}</strong>
            </div>
            <div className="success-ticket-row">
              <span>Ghế</span>
              <strong>{selectedSeats.join(', ')}</strong>
            </div>
            <div className="success-ticket-divider">
              <span className="notch left" />
              <span className="dashed" />
              <span className="notch right" />
            </div>
            <div className="success-ticket-row total-row">
              <span>Tổng thanh toán</span>
              <strong className="final-price">{finalTotal.toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>

          <div className="success-qr">
            <div className="qr-placeholder">
              <span>📱</span>
              <p>Mã QR vé</p>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn-download">Tải vé về máy</button>
            <Link to="/" className="btn-home">Về trang chủ</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-page">
      {/* ── Breadcrumb ── */}
      <div className="payment-breadcrumb">
        <button className="back-btn" onClick={() => navigate(-1)}>← Quay lại</button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="sep">›</span>
          <button onClick={() => navigate('/booking')} className="crumb-link">Đặt vé</button>
          <span className="sep">›</span>
          <span className="current">Thanh toán</span>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="payment-stepper">
        {['Chọn ghế', 'Combo', 'Thanh toán'].map((s, i) => (
          <div key={s} className={`pstepper-step ${i < 2 ? 'done' : 'active'}`}>
            <div className="pstepper-circle">{i < 2 ? '✓' : i + 1}</div>
            <span>{s}</span>
            {i < 2 && <div className="pstepper-line done" />}
          </div>
        ))}
      </div>

      <div className="payment-layout">
        {/* ══ LEFT: payment form ══ */}
        <div className="payment-form-col">

          {/* ── Payment methods ── */}
          <section className="pay-section">
            <h2 className="pay-section-title">
              <FaCreditCard /> Phương thức thanh toán
            </h2>
            <div className="method-list">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  className={`method-card ${method === m.id ? 'selected' : ''}`}
                  onClick={() => setMethod(m.id)}
                  type="button"
                >
                  <div className="method-radio">
                    <span className={`radio-dot ${method === m.id ? 'active' : ''}`} />
                  </div>
                  <div className="method-icon">{m.icon}</div>
                  <div className="method-info">
                    <span className="method-label">{m.label}</span>
                    <span className="method-desc">{m.desc}</span>
                  </div>
                  <div className="method-badges">
                    {m.badges.map((b) => (
                      <span key={b} className="method-badge">{b}</span>
                    ))}
                    {m.popular && <span className="method-popular">Phổ biến</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* ── Payment detail form ── */}
          {method === 'card' && (
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaLock /> Thông tin thẻ
              </h2>
              <div className="card-form">
                <div className="card-preview">
                  <div className="card-preview-chip">💳</div>
                  <div className="card-preview-number">
                    {cardInfo.number
                      ? cardInfo.number.replace(/(.{4})/g, '$1 ').trim()
                      : '**** **** **** ****'}
                  </div>
                  <div className="card-preview-bottom">
                    <span>{cardInfo.name || 'Tên chủ thẻ'}</span>
                    <span>{cardInfo.expiry || 'MM/YY'}</span>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Số thẻ</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={cardInfo.number}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 16)
                        setCardInfo({ ...cardInfo, number: val })
                      }}
                    />
                  </div>
                  <div className="form-group full">
                    <label>Tên chủ thẻ</label>
                    <input
                      type="text"
                      placeholder="NGUYEN VAN A"
                      value={cardInfo.name}
                      onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ngày hết hạn</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardInfo.expiry}
                      onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="password"
                      placeholder="•••"
                      maxLength={3}
                      value={cardInfo.cvv}
                      onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {method === 'banking' && (
            <section className="pay-section">
              <h2 className="pay-section-title"><FaUniversity /> Chọn ngân hàng</h2>
              <div className="bank-grid">
                {BANKS.map((bank) => (
                  <button
                    key={bank}
                    className={`bank-btn ${selectedBank === bank ? 'selected' : ''}`}
                    onClick={() => setSelectedBank(bank)}
                    type="button"
                  >
                    <span className="bank-icon">🏦</span>
                    <span>{bank}</span>
                  </button>
                ))}
              </div>
              {selectedBank && (
                <div className="banking-info">
                  <p>Chuyển khoản đến tài khoản:</p>
                  <div className="bank-detail-row"><span>Ngân hàng</span><strong>{selectedBank}</strong></div>
                  <div className="bank-detail-row"><span>Số tài khoản</span><strong>0123456789</strong></div>
                  <div className="bank-detail-row"><span>Chủ tài khoản</span><strong>CÔNG TY LUNEXA</strong></div>
                  <div className="bank-detail-row"><span>Nội dung CK</span><strong>LUNEXA {selectedSeats.join('')}</strong></div>
                </div>
              )}
            </section>
          )}

          {(method === 'momo') && (
            <section className="pay-section">
              <h2 className="pay-section-title">
                <FaMobileAlt /> Quét mã QR
              </h2>
              <div className="qr-pay-section">
                <div className="qr-code-box">
                  <div className="qr-code-placeholder">
                    <span>📲</span>
                    <p>Mã QR sẽ hiển thị sau khi xác nhận đơn hàng</p>
                  </div>
                </div>
                <div className="qr-instructions">
                  <h4>Hướng dẫn thanh toán</h4>
                  <ol>
                    <li>Mở ứng dụng MoMo trên điện thoại</li>
                    <li>Chọn tính năng "Quét mã" hoặc "QR Code"</li>
                    <li>Quét mã QR hiển thị trên màn hình</li>
                    <li>Xác nhận thông tin và hoàn tất thanh toán</li>
                  </ol>
                  <div className="qr-amount">
                    <span>Số tiền cần thanh toán</span>
                    <strong>{finalTotal.toLocaleString('vi-VN')}đ</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Promo code ── */}
          <section className="pay-section">
            <h2 className="pay-section-title"><FaTag /> Mã ưu đãi</h2>
            <div className="promo-row">
              <input
                type="text"
                placeholder="Nhập mã ưu đãi (thử: LUNEXA10)"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value); setPromoError('') }}
                className={promoApplied ? 'promo-success' : promoError ? 'promo-error' : ''}
              />
              <button
                className={`btn-apply-promo ${promoApplied ? 'applied' : ''}`}
                onClick={applyPromo}
                type="button"
              >
                {promoApplied ? '✓ Đã áp dụng' : 'Áp dụng'}
              </button>
            </div>
            {promoError && <p className="promo-msg error">{promoError}</p>}
            {promoApplied && <p className="promo-msg success">🎉 Giảm 10% thành công!</p>}
          </section>

          {/* ── Agree + Pay ── */}
          <div className="payment-agree-row">
            <label className="agree-label">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>Tôi đồng ý với <button className="link-btn" type="button">điều khoản dịch vụ</button> và <button className="link-btn" type="button">chính sách bảo mật</button></span>
            </label>
          </div>

          <button
            className={`btn-pay ${processing ? 'loading' : ''}`}
            disabled={!agreed || processing}
            onClick={handlePay}
            type="button"
          >
            {processing ? (
              <span className="pay-spinner" />
            ) : (
              <><FaLock /> Thanh toán {finalTotal.toLocaleString('vi-VN')}đ</>
            )}
          </button>

          <div className="secure-notice">
            <FaLock /> Giao dịch được mã hóa SSL 256-bit
          </div>
        </div>

        {/* ══ RIGHT: order summary ══ */}
        <aside className="payment-summary-col">
          <div className="order-card">
            <button
              className="order-card-toggle"
              onClick={() => setShowOrderDetail((v) => !v)}
              type="button"
            >
              <div className="order-card-toggle-left">
                <FaTicketAlt />
                <span>Chi tiết đơn hàng</span>
              </div>
              {showOrderDetail ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {showOrderDetail && (
              <div className="order-detail">
                {/* Movie info */}
                <div className="order-movie">
                  <div className="order-poster">🎬</div>
                  <div className="order-movie-info">
                    <h3>Doraemon: Nobita và Cuộc Chiến Vũ Trụ Tí Hon</h3>
                    <p>2D • Phụ đề Tiếng Việt</p>
                  </div>
                </div>

                <div className="order-divider" />

                <div className="order-rows">
                  <div className="order-row">
                    <span>🏢 Rạp</span>
                    <strong>{cinema}</strong>
                  </div>
                  <div className="order-row">
                    <span>📅 Ngày</span>
                    <strong>{day}</strong>
                  </div>
                  <div className="order-row">
                    <span>🕙 Suất chiếu</span>
                    <strong>{time}</strong>
                  </div>
                  <div className="order-row">
                    <span>💺 Ghế ngồi</span>
                    <strong>{selectedSeats.join(', ')}</strong>
                  </div>
                </div>

                <div className="order-divider" />

                <div className="order-price-rows">
                  <div className="order-price-row">
                    <span>Vé ({selectedSeats.length} ghế)</span>
                    <span>{total.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="order-price-row">
                    <span>Phí dịch vụ</span>
                    <span>{serviceFee.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {promoApplied && (
                    <div className="order-price-row discount">
                      <span>Giảm giá (10%)</span>
                      <span>-{discount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  )}
                </div>

                <div className="order-total-row">
                  <span>Tổng cộng</span>
                  <strong>{finalTotal.toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
            )}
          </div>

          {/* Membership info */}
          <div className="membership-notice">
            <span className="mem-icon">👑</span>
            <div>
              <strong>Thành viên Gold</strong>
              <p>Bạn sẽ nhận được <b>+50 điểm</b> sau giao dịch này</p>
            </div>
          </div>

          {/* Policy notes */}
          <div className="policy-notes">
            <div className="policy-item">
              <span>🔒</span>
              <span>Thanh toán an toàn, mã hóa 256-bit</span>
            </div>
            <div className="policy-item">
              <span>🔄</span>
              <span>Hoàn vé trước 2 giờ chiếu, áp dụng điều khoản</span>
            </div>
            <div className="policy-item">
              <span>📧</span>
              <span>Vé điện tử gửi qua email trong 5 phút</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
