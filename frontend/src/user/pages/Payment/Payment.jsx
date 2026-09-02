import { useMemo, useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FaCreditCard, FaUniversity, FaMobileAlt, FaLock, FaTag, FaShieldAlt, FaTicketAlt, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaChair } from 'react-icons/fa'
import './Payment.css'
import { userBookingService, userPromotionService } from '../../services/userApi'
import { buildVietQROnlyImageUrl } from '../../utils/vietqr'
import { getValidStoredToken } from '../../../utils/auth'
import { PAYMENT_BANKS as BANKS, PAYMENT_BANK_INFO as BANK_INFO, getPaymentBankLogo as bankLogo } from '../../../utils/paymentConfig'

const CARD_TYPES = [
  { name: 'Visa',       pattern: /^4/,      color: 'linear-gradient(135deg,#1a1f71,#2563eb)', icon: 'VISA' },
  { name: 'Mastercard', pattern: /^5[1-5]/, color: 'linear-gradient(135deg,#eb001b,#f79e1b)', icon: 'MC'   },
  { name: 'JCB',        pattern: /^35/,     color: 'linear-gradient(135deg,#003087,#009f6b)', icon: 'JCB'  },
  { name: 'Amex',       pattern: /^3[47]/,  color: 'linear-gradient(135deg,#0077c5,#179cde)', icon: 'AMEX' },
]
// Map bank id → BIN cho VietQR
const BANK_BIN_MAP = Object.fromEntries(BANKS.map(b => [b.id, b.bin]))
// ZaloPay logo inline (SiZalopay không có trong react-icons v5)
const ZaloPayLogo = () => (
  <svg viewBox="0 0 40 40" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#0068FF"/>
    <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle"
      fill="white" fontSize="13" fontWeight="900" fontFamily="Arial, sans-serif">Z</text>
  </svg>
)
const API_BASE = import.meta.env.VITE_API_URL || '/api'
const fmt = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const foodLabel = (item) => [`${item.quantity}x ${item.name}`, item.popcornType, item.drinkType].filter(Boolean).join(' • ')

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useSelector((s) => s.user?.profile)
  const storedToken = typeof window !== 'undefined' ? getValidStoredToken() : null
  const emailNotVerified = Boolean(currentUser) && currentUser.email_verified === false
  const { movieId=null, showtimeId=null, movieTitle='', cinema='', roomName='', roomType='', day='', time='',
    selectedSeats=[], selectedSeatLabels=[], selectedSeatUnits=[], seatTotal=0, comboTotal=0,
    snackTotal=0, totalWithSnacks, foodItems=[], total=0 } = location.state ?? {}

  const [method, setMethod] = useState('zalopay')
  const [bank, setBank] = useState('VCB')
  const [bankSearch, setBankSearch] = useState('')
  const [promo, setPromo] = useState('')
  const [promoOk, setPromoOk] = useState(false)
  const [promoErr, setPromoErr] = useState('')
  const [promoData, setPromoData] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [membershipTier, setMembershipTier] = useState(null)
  const [membershipReady, setMembershipReady] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const errRef = useRef(null)

  const detectedCard = useMemo(() => null, []) // unused — card handled by ZaloPay Gateway
  const seats = selectedSeatLabels.length > 0 ? selectedSeatLabels : selectedSeats
  const seatTot  = Number(seatTotal  || 0)
  const snackTot = Number(snackTotal || 0)
  const comboTot = Number(comboTotal || 0)
  const base = Number(totalWithSnacks ?? (seatTot + snackTot + comboTot) || total)
  const foods = useMemo(() => Array.isArray(foodItems) ? foodItems.filter(i => Number(i?.quantity||0) > 0) : [], [foodItems])
  const foodTransferSummary = useMemo(() => {
    if (!foods.length) return ''

    return foods
      .map((item) => {
        const qty = Number(item?.quantity || 0)
        const name = String(item?.name || 'Mon').trim()
        const options = [item?.popcornType, item?.drinkType]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
          .join('-')

        return `${qty}x ${name}${options ? `(${options})` : ''}`
      })
      .join('; ')
  }, [foods])
  const membershipPercent = Number(membershipTier?.discount || 0)
  const memberDisc = Math.round(base * membershipPercent / 100)
  const amountAfterMember = Math.max(0, base - memberDisc)
  const seatAmountAfterMember = Math.max(0, Math.round(seatTot * (1 - membershipPercent / 100)))
  const comboAmountAfterMember = Math.max(0, amountAfterMember - seatAmountAfterMember)
  const disc = promoOk && promoData ? Math.min(Number(promoData.discountAmount || 0), amountAfterMember) : 0
  const amountAfterDiscounts = Math.max(0, amountAfterMember - disc)
  const fee = Math.round(amountAfterDiscounts * 0.08)
  const total2 = amountAfterDiscounts + fee
  // Hàm loại bỏ dấu tiếng Việt và ký tự đặc biệt để tạo nội dung chuyển tiền
  const toTransferSlug = (str) =>
    String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, ' ')

  // Format: tenrap_tenphim_ngayvakhunggio_suatchieu_ghe
  // Ví dụ: LuneXa Da Nang_Avatar 2_Thu 6 21/02_10:00 2D_A1 A2
  const note = [
    toTransferSlug(cinema),
    toTransferSlug(movieTitle),
    toTransferSlug(day),
    toTransferSlug(time),
    seats.join(' '),
    foodTransferSummary ? `FOOD ${toTransferSlug(foodTransferSummary)}` : '',
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('_')
    .slice(0, 150) // ZaloPay giới hạn độ dài description

  const qrOnly = useMemo(() => buildVietQROnlyImageUrl({
    bankBin: BANK_BIN_MAP[bank] || VIETQR_BANK_BIN['Vietcombank'],
    accountNumber: BANK_INFO.accountNumber, amount: total2, addInfo: note, accountName: BANK_INFO.accountName,
  }), [bank, total2, note])

  const applyPromo = async () => {
    if (!promo.trim()) { setPromoErr('Vui lòng nhập mã ưu đãi.'); return }
    setPromoLoading(true); setPromoErr('')
    try {
      const r = await userPromotionService.validateCode(promo.trim(), {
        orderAmount: amountAfterMember,
        seatAmount: seatAmountAfterMember,
        comboAmount: comboAmountAfterMember,
        userId: currentUser?.id,
      })
      if (r?.valid) { setPromoOk(true); setPromoData(r.promo) }
      else { setPromoErr(r?.message || 'Mã không hợp lệ.'); setPromoOk(false); setPromoData(null) }
    } catch (e) { setPromoErr(e.message || 'Mã không hợp lệ.'); setPromoOk(false); setPromoData(null) }
    finally { setPromoLoading(false) }
  }

  const pay = async () => {
    if (!agreed || busy) return
    if (!currentUser?.id) { setErr('Vui lòng đăng nhập trước khi thanh toán.'); navigate('/login', { state: { from: '/payment', paymentState: location.state ?? null } }); return }
    if (emailNotVerified) {
      setErr('Vui lòng xác minh email trước khi thanh toán.')
      navigate('/profile?tab=edit')
      return
    }
    if (!showtimeId) { setErr('Không xác định được suất chiếu.'); return }
    if (!selectedSeatUnits?.length) { setErr('Bạn chưa chọn ghế hợp lệ.'); return }
    if (!membershipReady) { setErr('Đang tải ưu đãi thành viên. Vui lòng thử lại sau giây lát.'); return }
    setBusy(true); setErr('')
    try {
      // ZaloPay / Visa / Master / JCB — tạo ZaloPay order TRƯỚC, booking tạo sau khi callback
      if (method === 'zalopay' || method === 'card') {
        const preferredMethod = method === 'card' ? 'international_card' : 'zalopay_wallet'
        const zlp = await userBookingService.createZaloPayOrder(currentUser.id, {
          amount: Math.round(total2), // ZaloPay yêu cầu integer VND
          description: note,
          preferredMethod,
          // booking data — backend lưu tạm, tạo booking khi callback thành công
          movieId,
          showtimeId,
          seatUnits: selectedSeatUnits,
          foodItems: foods,
          promoCode: promoOk ? (promoData?.code || promo.trim()) : '',
          paymentMethod: method,
        })
        // Lưu context vào sessionStorage để hiển thị khi redirect về
        sessionStorage.setItem('zlp_pending', JSON.stringify({
          appTransId: zlp.appTransId,
          movieTitle, cinema, day, time,
          displaySeats: seats,
          foods,
          finalTotal: Math.round(total2),
          method,
        }))
        // Mở ZaloPay trong tab mới — tab app vẫn còn để detect khi user quay lại
        if (!zlp.orderUrl) throw new Error('Không nhận được đường dẫn thanh toán từ ZaloPay.')
        window.location.assign(zlp.orderUrl)
        // Chuyển sang trang chờ xác nhận
        return
      }

      // Chuyển khoản ngân hàng — tạo booking ngay (pending, không lock ghế theo ZaloPay)
      const pm = method === 'banking' && bank ? `${method}:${bank}` : method
      const res = await userBookingService.create(currentUser.id, { movieId, showtimeId, seatUnits: selectedSeatUnits, foodItems: foods, promoCode: promoOk ? (promoData?.code || promo.trim()) : '', paymentMethod: pm })
      const booking = res?.booking || null
      navigate('/payment/pending', { replace: true, state: { createdBooking: booking, movieTitle, cinema, day, time, displaySeats: seats, groupedFoodItems: foods, finalTotal: total2, paymentLink: '', paymentQrUrl: qrOnly, vietQROnlyUrl: qrOnly, bankTransferNote: note, method, selectedBank: BANKS.find(b=>b.id===bank)?.label || bank, accountNumber: BANK_INFO.accountNumber, accountName: BANK_INFO.accountName, pointsAwarded: booking?.pointsAwarded??0, pointsBalance: booking?.pointsBalance??0, currentUserId: currentUser.id } })
    } catch (e) { setErr(e.message || 'Không thể lưu đơn thanh toán.') }
    finally { setBusy(false) }
  }

  useEffect(() => { if (err && errRef.current) errRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [err])

  useEffect(() => {
    if (!currentUser?.id) {
      setMembershipTier(null)
      setMembershipReady(false)
      return
    }

    let active = true
    setMembershipReady(false)
    fetch(`${API_BASE}/points/user/${currentUser.id}`, {
      headers: { Authorization: `Bearer ${getValidStoredToken() || ''}` },
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active) setMembershipTier(data?.user?.tier || null)
      })
      .catch(() => {
        if (active) setMembershipTier(null)
      })
      .finally(() => {
        if (active) setMembershipReady(true)
      })
    return () => { active = false }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id && !storedToken) {
      navigate('/login', { replace: true, state: { from: '/payment', paymentState: location.state ?? null } })
    }
  }, [currentUser?.id, location.state, navigate, storedToken])

  useEffect(() => {
    if (emailNotVerified) {
      navigate('/profile?tab=edit', { replace: true })
    }
  }, [emailNotVerified, navigate])

  return (
    <div className="pay-page">
      <div className="pay-breadcrumb">
        <button onClick={() => navigate(-1)}>← Quay lại</button>
        <span>Trang chủ › Đặt vé › <b>Thanh toán</b></span>
      </div>

      <div className="pay-stepper">
        {['Chọn ghế', 'Combo', 'Thanh toán'].map((s, i) => (
          <div key={s} className={`pay-step ${i === 2 ? 'active' : 'done'}`}>
            <div className="pay-step-dot">{i < 2 ? '✓' : '3'}</div>
            <span>{s}</span>
            {i < 2 && <div className="pay-step-line" />}
          </div>
        ))}
      </div>

      {err && (
        <div ref={errRef} className="pay-error" role="alert">
          <span>⚠️</span>
          <div><b>Không thể hoàn tất thanh toán</b><p>{err}</p></div>
          <button onClick={() => setErr('')} aria-label="Đóng">✕</button>
        </div>
      )}

      <div className="pay-layout">
        <div className="pay-left">
          {/* Chọn phương thức */}
          <div className="pay-card">
            <h3 className="pay-card-title">Phương thức thanh toán</h3>
            <div className="pay-method-list">
              <label className={`pay-method-item ${method==='zalopay'?'selected':''}`}>
                <input type="radio" name="m" value="zalopay" checked={method==='zalopay'} onChange={() => setMethod('zalopay')} />
                <div className="pay-method-logo zlp-logo"><ZaloPayLogo /></div>
                <div className="pay-method-body">
                  <span className="pay-method-name">Ví ZaloPay</span>
                  <span className="pay-method-sub">Thanh toán qua ZaloPay, VietQR, ATM, Visa</span>
                </div>
                <span className="pay-method-tag hot">Phổ biến</span>
              </label>
              <label className={`pay-method-item ${method==='banking'?'selected':''}`}>
                <input type="radio" name="m" value="banking" checked={method==='banking'} onChange={() => setMethod('banking')} />
                <div className="pay-method-logo bank-logo"><FaUniversity /></div>
                <div className="pay-method-body">
                  <span className="pay-method-name">Chuyển khoản ngân hàng</span>
                  <span className="pay-method-sub">VietQR — tự điền STK, số tiền, nội dung</span>
                </div>
              </label>
              <label className={`pay-method-item ${method==='card'?'selected':''}`}>
                <input type="radio" name="m" value="card" checked={method==='card'} onChange={() => setMethod('card')} />
                <div className="pay-method-logo card-logo"><FaCreditCard /></div>
                <div className="pay-method-body">
                  <span className="pay-method-name">Thẻ tín dụng / Ghi nợ</span>
                  <span className="pay-method-sub">Visa, Mastercard, JCB, Amex</span>
                </div>
                <div className="pay-method-badges">
                  {['VISA','MC','JCB'].map(b => <span key={b} className="pay-badge">{b}</span>)}
                </div>
              </label>
            </div>
          </div>

          {/* ZaloPay info */}
          {method === 'zalopay' && (
            <div className="pay-card pay-zalopay-info">
              <div className="zlp-hero">
                <div className="zlp-icon"><ZaloPayLogo /></div>
                <div>
                  <h4>Thanh toán qua ZaloPay Gateway</h4>
                  <p>Bấm "Thanh toán" để chuyển sang trang ZaloPay — hỗ trợ ví ZaloPay, VietQR, ATM, Visa/Master</p>
                </div>
              </div>
              <div className="zlp-methods">
                {['Ví ZaloPay','VietQR','ATM / Internet Banking','Visa / Master / JCB'].map(m => (
                  <div key={m} className="zlp-method-chip">✓ {m}</div>
                ))}
              </div>
              <div className="zlp-amount-row">
                <span>Số tiền thanh toán</span>
                <strong>{fmt(total2)}</strong>
              </div>
            </div>
          )}

          {/* Banking VietQR */}
          {method === 'banking' && (
            <div className="pay-card">
              <h3 className="pay-card-title">Thẻ nội địa Napas / Internet Banking</h3>

              {/* Search */}
              <div className="pay-bank-search">
                <span className="pay-bank-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Tìm ngân hàng..."
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                />
              </div>

              {/* Bank grid */}
              <div className="pay-bank-grid-full">
                {BANKS.filter(b =>
                  !bankSearch || b.label.toLowerCase().includes(bankSearch.toLowerCase())
                ).map(b => (
                  <button key={b.id} type="button"
                    className={`pay-bank-item ${bank === b.id ? 'selected' : ''}`}
                    onClick={() => setBank(b.id)}
                  >
                    <div className="pay-bank-item-logo">
                      <img
                        src={bankLogo(b.id)}
                        alt={b.label}
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}
                      />
                      <span className="pay-bank-item-fallback">{b.id}</span>
                    </div>
                    <span className="pay-bank-item-label">{b.shortName}</span>
                    {bank === b.id && <span className="pay-bank-item-check">✓</span>}
                  </button>
                ))}
              </div>

              {/* Selected bank info — không có QR */}
              {bank && (() => {
                const selectedBank = BANKS.find(b => b.id === bank)
                return (
                  <div className="pay-bank-selected-info">
                    <div className="pay-bank-selected-header">
                      <img src={bankLogo(bank)} alt={selectedBank?.label} className="pay-bank-selected-logo" />
                      <span>{selectedBank?.label}</span>
                    </div>
                    <div className="pay-bank-selected-row"><span>Số tài khoản</span><b>{BANK_INFO.accountNumber}</b></div>
                    <div className="pay-bank-selected-row"><span>Chủ tài khoản</span><b>{BANK_INFO.accountName}</b></div>
                    <div className="pay-bank-selected-row"><span>Số tiền</span><b className="pay-hl">{fmt(total2)}</b></div>
                    <div className="pay-bank-selected-row"><span>Nội dung CK</span><b>{note}</b></div>
                    <p className="pay-bank-selected-hint">
                      💡 Bấm <strong>Thanh toán</strong> — mã QR sẽ được tạo để quét bằng app ngân hàng
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Visa / Master / JCB qua ZaloPay Gateway */}
          {method === 'card' && (
            <div className="pay-card pay-zalopay-info">
              <div className="zlp-hero">
                <div className="zlp-icon"><ZaloPayLogo /></div>
                <div>
                  <h4>Thanh toán thẻ Visa / Master / JCB</h4>
                  <p>Bấm "Thanh toán" để chuyển sang trang ZaloPay Gateway — nhập thông tin thẻ an toàn trực tiếp trên trang ZaloPay</p>
                </div>
              </div>
              <div className="zlp-methods">
                {['Visa','Mastercard','JCB','Amex'].map(m => (
                  <div key={m} className="zlp-method-chip">💳 {m}</div>
                ))}
              </div>
              <div className="zlp-amount-row">
                <span>Số tiền thanh toán</span>
                <strong>{fmt(total2)}</strong>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #9ca3af)', marginTop: '8px' }}>
                🔒 Thông tin thẻ được nhập và mã hoá trực tiếp trên cổng ZaloPay — website không lưu thông tin thẻ
              </p>
            </div>
          )}

          {/* Promo */}
          <div className="pay-card">
            <h3 className="pay-card-title"><FaTag /> Mã ưu đãi</h3>
            <div className="pay-promo-row">
              <input type="text" placeholder="Nhập mã ưu đãi…" value={promo} disabled={promoOk}
                className={promoOk?'ok':promoErr?'err':''}
                onChange={e => { setPromo(e.target.value); setPromoErr(''); if (promoOk) { setPromoOk(false); setPromoData(null) } }}
                onKeyDown={e => e.key==='Enter' && !promoLoading && applyPromo()} />
              <button type="button" disabled={promoLoading} className={promoOk?'applied':''}
                onClick={promoOk ? () => { setPromoOk(false); setPromoData(null); setPromo(''); setPromoErr('') } : applyPromo}>
                {promoLoading ? '…' : promoOk ? '✓ Huỷ' : 'Áp dụng'}
              </button>
            </div>
            {promoErr && <p className="pay-promo-msg err">{promoErr}</p>}
            {promoOk && promoData && <p className="pay-promo-msg ok">🎉 {promoData.description||promoData.code} — Giảm {fmt(promoData.discountAmount)}</p>}
          </div>

          {/* Agree + Pay */}
          <label className="pay-agree">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>Tôi đồng ý với <button type="button">điều khoản dịch vụ</button> và <button type="button">chính sách bảo mật</button></span>
          </label>

          <button className={`pay-btn ${busy?'busy':''}`} disabled={!agreed||busy} onClick={pay} type="button">
            {busy ? <><span className="pay-spin" /> Đang xử lý…</> : <><FaLock /> Thanh toán {fmt(total2)}</>}
          </button>

          <div className="pay-secure"><FaShieldAlt /> Giao dịch được mã hóa SSL 256-bit</div>
        </div>

        {/* RIGHT — Summary */}
        <aside className="pay-right">
          <div className="pay-summary">
            <h3 className="pay-summary-title"><FaTicketAlt /> Thông tin đặt vé</h3>
            <div className="pay-movie-row">
              <div className="pay-movie-poster">🎬</div>
              <div><div className="pay-movie-name">{movieTitle}</div><div className="pay-movie-sub">2D • Phụ đề Tiếng Việt</div></div>
            </div>
            <div className="pay-divider" />
            <div className="pay-info-list">
              <div className="pay-info-row"><span><FaMapMarkerAlt /> Rạp</span><b>{cinema}</b></div>
              <div className="pay-info-row"><span><FaCalendarAlt /> Ngày</span><b>{day}</b></div>
              <div className="pay-info-row"><span><FaClock /> Suất chiếu</span><b>{time}</b></div>
              {roomName && <div className="pay-info-row"><span>🎦 Phòng</span><b>{roomName}{roomType?` • ${roomType}`:''}</b></div>}
              <div className="pay-info-row"><span><FaChair /> Ghế</span><b>{seats.join(', ')}</b></div>
            </div>
            {foods.length > 0 && <>
              <div className="pay-divider" />
              {foods.map(item => (
                <div key={`${item.key}-${item.quantity}`} className="pay-food-row">
                  <span>{foodLabel(item)}</span><b>{fmt(item.totalPrice)}</b>
                </div>
              ))}
            </>}
            <div className="pay-divider" />
            <div className="pay-price-list">
              <div className="pay-price-row"><span>Vé ({seats.length} ghế)</span><span>{fmt(seatTot)}</span></div>
              {snackTot > 0 && <div className="pay-price-row"><span>Bắp &amp; Nước</span><span>{fmt(snackTot)}</span></div>}
              {comboTot > 0 && <div className="pay-price-row"><span>Combo</span><span>{fmt(comboTot)}</span></div>}
              {memberDisc > 0 && <div className="pay-price-row green"><span>Ưu đãi thành viên {membershipTier?.name ? `(${membershipTier.name} ${membershipPercent}%)` : ''}</span><span>-{fmt(memberDisc)}</span></div>}
              <div className="pay-price-row"><span>Phí dịch vụ (8%)</span><span>{fmt(fee)}</span></div>
              {promoOk && <div className="pay-price-row green"><span>Giảm giá</span><span>-{fmt(disc)}</span></div>}
            </div>
            <div className="pay-total-row"><span>Tổng cộng</span><strong>{fmt(total2)}</strong></div>
            <div className="pay-divider" />
            <div className="pay-notices">
              <div>🔒 Thanh toán an toàn, mã hóa 256-bit</div>
              <div>🔄 Vé đã thanh toán không hỗ trợ hoàn hoặc hủy</div>
              <div>📧 Vé điện tử gửi qua email trong 5 phút</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
