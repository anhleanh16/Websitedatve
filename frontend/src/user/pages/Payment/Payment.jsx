import { useMemo, useState, useEffect, useRef } from 'react'
import { useSelector } from 'react-redux'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { FaCreditCard, FaUniversity, FaMobileAlt, FaLock, FaEye, FaEyeSlash, FaTag, FaShieldAlt, FaTicketAlt, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaChair } from 'react-icons/fa'
import './Payment.css'
import { userBookingService, userPromotionService } from '../../services/userApi'
import { buildVietQROnlyImageUrl } from '../../utils/vietqr'

const CARD_TYPES = [
  { name: 'Visa',       pattern: /^4/,      color: 'linear-gradient(135deg,#1a1f71,#2563eb)', icon: 'VISA' },
  { name: 'Mastercard', pattern: /^5[1-5]/, color: 'linear-gradient(135deg,#eb001b,#f79e1b)', icon: 'MC'   },
  { name: 'JCB',        pattern: /^35/,     color: 'linear-gradient(135deg,#003087,#009f6b)', icon: 'JCB'  },
  { name: 'Amex',       pattern: /^3[47]/,  color: 'linear-gradient(135deg,#0077c5,#179cde)', icon: 'AMEX' },
]
const BANKS = [
  { id: 'VCB',  bin: '970436', label: 'Vietcombank',      shortName: 'Vietcombank'      },
  { id: 'AGR',  bin: '970405', label: 'Agribank',          shortName: 'Agribank'         },
  { id: 'ICB',  bin: '970415', label: 'VietinBank',        shortName: 'VietinBank'       },
  { id: 'BIDV', bin: '970418', label: 'BIDV',              shortName: 'BIDV'             },
  { id: 'MB',   bin: '970422', label: 'MB Bank',           shortName: 'MBBank'           },
  { id: 'TCB',  bin: '970407', label: 'Techcombank',       shortName: 'Techcombank'      },
  { id: 'ACB',  bin: '970416', label: 'ACB',               shortName: 'ACB'              },
  { id: 'VPB',  bin: '970432', label: 'VPBank',            shortName: 'VPBank'           },
  { id: 'TPB',  bin: '970423', label: 'TPBank',            shortName: 'TPBank'           },
  { id: 'STB',  bin: '970403', label: 'Sacombank',         shortName: 'Sacombank'        },
  { id: 'HDB',  bin: '970437', label: 'HDBank',            shortName: 'HDBank'           },
  { id: 'VIB',  bin: '970441', label: 'VIB',               shortName: 'VIB'              },
  { id: 'SHB',  bin: '970443', label: 'SHB',               shortName: 'SHB'              },
  { id: 'EIB',  bin: '970431', label: 'Eximbank',          shortName: 'Eximbank'         },
  { id: 'MSB',  bin: '970426', label: 'MSB',               shortName: 'MSB'              },
  { id: 'OCB',  bin: '970448', label: 'OCB',               shortName: 'OCB'              },
  { id: 'LPB',  bin: '970449', label: 'LienVietPostBank',  shortName: 'LienVietPostBank' },
  { id: 'NAB',  bin: '970428', label: 'Nam A Bank',        shortName: 'NamABank'         },
  { id: 'PGB',  bin: '970430', label: 'PGBank',            shortName: 'PGBank'           },
  { id: 'VCCB', bin: '970454', label: 'Bản Việt Bank',     shortName: 'VietCapitalBank'  },
  { id: 'BAB',  bin: '970409', label: 'Bắc Á Bank',        shortName: 'BacABank'         },
  { id: 'SEAB', bin: '970440', label: 'SeABank',           shortName: 'SeABank'          },
  { id: 'CAKE', bin: '546034', label: 'cake by VPBank',    shortName: 'cake'             },
  { id: 'IVB',  bin: '970434', label: 'Indovina Bank',     shortName: 'IndovinaBank'     },
  { id: 'VAB',  bin: '970427', label: 'Việt Á Bank',       shortName: 'VietABank'        },
  { id: 'KLB',  bin: '970452', label: 'KiênLong Bank',     shortName: 'KienLongBank'     },
  { id: 'ABB',  bin: '970425', label: 'AnBình Bank',       shortName: 'ABBank'           },
  { id: 'VBB',  bin: '970433', label: 'Việt Bank',         shortName: 'VietBank'         },
  { id: 'BVB',  bin: '970438', label: 'BaoViet Bank',      shortName: 'BaoVietBank'      },
  { id: 'SGCB', bin: '970400', label: 'Saigonbank',        shortName: 'Saigonbank'       },
  { id: 'NCB',  bin: '970419', label: 'NCB',               shortName: 'NCB'              },
  { id: 'SGB',  bin: '970400', label: 'Saigon Bank',       shortName: 'SGB'              },
  { id: 'OJB',  bin: '970414', label: 'OceanBank',         shortName: 'Oceanbank'        },
  { id: 'PBVN', bin: '970412', label: 'PVcomBank',         shortName: 'PVcomBank'        },
  { id: 'VDB',  bin: '007',    label: 'VDB',               shortName: 'VDB'              },
  { id: 'COOPBANK', bin: '970446', label: 'COOPBANK',      shortName: 'COOPBANK'         },
]

// Logo từ cdn.vietqr.io — chính thức, không cần auth
const bankLogo = (code) => `https://cdn.vietqr.io/img/${code}.png`

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
const BANK_INFO = { accountNumber: '0328959755', accountName: 'CÔNG TY SWEETSTAR', prefix: 'SWEETSTAR' }
const fmt = (v) => `${Number(v || 0).toLocaleString('vi-VN')}đ`
const foodLabel = (item) => [`${item.quantity}x ${item.name}`, item.popcornType, item.drinkType].filter(Boolean).join(' • ')

export default function Payment() {
  const location = useLocation()
  const navigate = useNavigate()
  const currentUser = useSelector((s) => s.user?.profile)
  const { movieId=null, showtimeId=null, movieTitle='', cinema='', roomName='', roomType='', day='', time='',
    selectedSeats=[], selectedSeatLabels=[], selectedSeatUnits=[], seatTotal=0, comboTotal=0,
    snackTotal=0, totalWithSnacks, foodItems=[], total=0 } = location.state ?? {}

  const [method, setMethod] = useState('zalopay')
  const [bank, setBank] = useState('VCB')
  const [bankSearch, setBankSearch] = useState('')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [showCVV, setShowCVV] = useState(false)
  const [promo, setPromo] = useState('')
  const [promoOk, setPromoOk] = useState(false)
  const [promoErr, setPromoErr] = useState('')
  const [promoData, setPromoData] = useState(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const errRef = useRef(null)

  const detectedCard = useMemo(() => card.number ? CARD_TYPES.find(t => t.pattern.test(card.number)) : null, [card.number])
  const seats = selectedSeatLabels.length > 0 ? selectedSeatLabels : selectedSeats
  const seatTot  = Number(seatTotal  || 0)
  const snackTot = Number(snackTotal || 0)
  const comboTot = Number(comboTotal || 0)
  const base = Number(totalWithSnacks ?? (seatTot + snackTot + comboTot) || total)
  const foods = useMemo(() => Array.isArray(foodItems) ? foodItems.filter(i => Number(i?.quantity||0) > 0) : [], [foodItems])
  const disc = promoOk && promoData ? promoData.discountAmount : 0
  const fee = 5000
  const total2 = base + fee - disc
  const note = `${BANK_INFO.prefix} ${seats.join('')}`

  const qrOnly = useMemo(() => buildVietQROnlyImageUrl({
    bankBin: BANK_BIN_MAP[bank] || VIETQR_BANK_BIN['Vietcombank'],
    accountNumber: BANK_INFO.accountNumber, amount: total2, addInfo: note, accountName: BANK_INFO.accountName,
  }), [bank, total2, note])

  const applyPromo = async () => {
    if (!promo.trim()) { setPromoErr('Vui lòng nhập mã ưu đãi.'); return }
    setPromoLoading(true); setPromoErr('')
    try {
      const r = await userPromotionService.validateCode(promo.trim(), { orderAmount: base, userId: currentUser?.id })
      if (r?.valid) { setPromoOk(true); setPromoData(r.promo) }
      else { setPromoErr(r?.message || 'Mã không hợp lệ.'); setPromoOk(false); setPromoData(null) }
    } catch (e) { setPromoErr(e.message || 'Mã không hợp lệ.'); setPromoOk(false); setPromoData(null) }
    finally { setPromoLoading(false) }
  }

  const pay = async () => {
    if (!agreed || busy) return
    if (method === 'card') {
      if (!card.number || card.number.length < 13) { setErr('Vui lòng nhập số thẻ hợp lệ'); return }
      if (!card.name?.trim()) { setErr('Vui lòng nhập tên chủ thẻ'); return }
      if (!card.expiry) { setErr('Vui lòng chọn ngày hết hạn'); return }
      if (!card.cvv || card.cvv.length < 3) { setErr('Vui lòng nhập CVV hợp lệ'); return }
    }
    if (!currentUser?.id) { setErr('Vui lòng đăng nhập trước khi thanh toán.'); navigate('/login'); return }
    if (!showtimeId) { setErr('Không xác định được suất chiếu.'); return }
    if (!selectedSeatUnits?.length) { setErr('Bạn chưa chọn ghế hợp lệ.'); return }
    setBusy(true); setErr('')
    try {
      const pm = method === 'banking' && bank ? `${method}:${bank}` : method
      const res = await userBookingService.create(currentUser.id, { movieId, showtimeId, seatUnits: selectedSeatUnits, foodItems: foods, paymentMethod: pm })
      const booking = res?.booking || null
      if (method === 'zalopay') {
        const zlp = await userBookingService.createZaloPayOrder(currentUser.id, { amount: total2, description: note, bookingCode: booking?.booking_code || '', preferredMethod: 'zalopay_wallet' })
        sessionStorage.setItem('zlp_pending', JSON.stringify({ appTransId: zlp.appTransId, createdBooking: booking, movieTitle, cinema, day, time, displaySeats: seats, foods, finalTotal: total2, method, pointsAwarded: booking?.pointsAwarded??0, pointsBalance: booking?.pointsBalance??0 }))
        window.location.href = zlp.orderUrl
        return
      }
      navigate('/payment/pending', { replace: true, state: { createdBooking: booking, movieTitle, cinema, day, time, displaySeats: seats, groupedFoodItems: foods, finalTotal: total2, paymentLink: '', paymentQrUrl: qrOnly, vietQROnlyUrl: qrOnly, bankTransferNote: note, method, selectedBank: BANKS.find(b=>b.id===bank)?.label || bank, accountNumber: BANK_INFO.accountNumber, accountName: BANK_INFO.accountName, pointsAwarded: booking?.pointsAwarded??0, pointsBalance: booking?.pointsBalance??0 } })
    } catch (e) { setErr(e.message || 'Không thể lưu đơn thanh toán.') }
    finally { setBusy(false) }
  }

  useEffect(() => { if (err && errRef.current) errRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, [err])

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

          {/* Card form */}
          {method === 'card' && (
            <div className="pay-card">
              <h3 className="pay-card-title">Thông tin thẻ</h3>
              <div className="pay-card-preview" style={{ background: detectedCard?.color || 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                <div className="pcp-top"><span>💳</span>{detectedCard && <span className="pcp-type">{detectedCard.icon}</span>}</div>
                <div className="pcp-number">{card.number ? card.number.replace(/(.{4})/g,'$1 ').trim() : '**** **** **** ****'}</div>
                <div className="pcp-bottom"><span>{card.name||'TÊN CHỦ THẺ'}</span><span>{card.expiry||'MM/YY'}</span></div>
              </div>
              <div className="pay-form-grid">
                <div className="pay-fg span2"><label>Số thẻ</label>
                  <input type="text" placeholder="1234 5678 9012 3456" value={card.number.replace(/(.{4})/g,'$1 ').trim()} onChange={e => setCard({...card, number: e.target.value.replace(/\D/g,'').slice(0,16)})} />
                </div>
                <div className="pay-fg span2"><label>Tên chủ thẻ</label>
                  <input type="text" placeholder="NGUYEN VAN A" value={card.name} onChange={e => setCard({...card, name: e.target.value.toUpperCase()})} />
                </div>
                <div className="pay-fg"><label>Ngày hết hạn</label>
                  <input type="month" value={card.expiry} onChange={e => setCard({...card, expiry: e.target.value})} />
                </div>
                <div className="pay-fg"><label>CVV</label>
                  <div className="pay-cvv-wrap">
                    <input type={showCVV?'text':'password'} placeholder="•••" maxLength={4} value={card.cvv} onChange={e => setCard({...card, cvv: e.target.value.replace(/\D/g,'').slice(0,4)})} />
                    <button type="button" onClick={() => setShowCVV(!showCVV)}>{showCVV ? <FaEyeSlash /> : <FaEye />}</button>
                  </div>
                </div>
              </div>
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
              <div className="pay-price-row"><span>Phí dịch vụ</span><span>{fmt(fee)}</span></div>
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
