import { useState } from 'react'
import { useSelector } from 'react-redux'
import { FaCrown, FaStar, FaGift, FaTicketAlt, FaHistory, FaInfoCircle, FaCopy, FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { MdCardMembership, MdLocalOffer } from 'react-icons/md'
import './membership.css'

// --- Mock data ---
const MOCK_VOUCHERS = [
  { id: 1, code: 'LUNA50K', title: 'Giảm 50.000đ', desc: 'Áp dụng cho đơn từ 150.000đ', expiry: '30/06/2026', color: '#7c3aed' },
  { id: 2, code: 'FREEPOP', title: 'Combo bắp + nước miễn phí', desc: 'Áp dụng khi mua từ 2 vé trở lên', expiry: '15/07/2026', color: '#0ea5e9' },
  { id: 3, code: 'IMAX20', title: 'Giảm 20% vé IMAX', desc: 'Không áp dụng ngày lễ', expiry: '31/07/2026', color: '#f59e0b' },
]

const MOCK_REWARDS = [
  { id: 1, points: 200, title: 'Vé xem phim 2D', icon: '🎟️' },
  { id: 2, points: 350, title: 'Combo bắp rang + nước lớn', icon: '🍿' },
  { id: 3, points: 500, title: 'Vé IMAX miễn phí', icon: '🎬' },
  { id: 4, points: 100, title: 'Giảm 20.000đ', icon: '🏷️' },
  { id: 5, points: 150, title: 'Nước uống miễn phí', icon: '🥤' },
  { id: 6, points: 800, title: 'Gói VIP 1 tháng', icon: '👑' },
]

const MOCK_BENEFITS = [
  { icon: '🎟️', title: 'Đặt vé ưu tiên', desc: 'Đặt trước 30 phút so với khách thường' },
  { icon: '🍿', title: 'Ưu đãi combo', desc: 'Giảm 15% tất cả combo đồ ăn tại rạp' },
  { icon: '🎂', title: 'Quà sinh nhật', desc: 'Voucher 100K và 1 vé miễn phí vào ngày sinh nhật' },
  { icon: '⭐', title: 'Điểm nhân đôi', desc: 'Tích điểm x2 vào mỗi thứ 3 hàng tuần' },
  { icon: '🎬', title: 'Suất chiếu sớm', desc: 'Xem phim trước công chiếu 1-2 ngày' },
  { icon: '🅿️', title: 'Bãi đậu xe miễn phí', desc: 'Miễn phí 2 giờ cho thành viên Gold trở lên' },
]

const MOCK_HISTORY = [
  { id: 1, date: '07/06/2026', desc: 'Đặt vé phim Doraemon', points: +50, type: 'earn' },
  { id: 2, date: '05/06/2026', desc: 'Đổi thưởng: Giảm 20.000đ', points: -100, type: 'spend' },
  { id: 3, date: '01/06/2026', desc: 'Đặt vé phim Avengers IMAX', points: +120, type: 'earn' },
  { id: 4, date: '28/05/2026', desc: 'Đặt vé phim Inside Out 2', points: +60, type: 'earn' },
  { id: 5, date: '20/05/2026', desc: 'Đổi thưởng: Combo bắp + nước', points: -350, type: 'spend' },
  { id: 6, date: '15/05/2026', desc: 'Sinh nhật thành viên', points: +200, type: 'bonus' },
]

const TIERS = [
  { name: 'Silver', min: 0, max: 499, color: '#94a3b8', icon: '🥈' },
  { name: 'Gold', min: 500, max: 1499, color: '#f59e0b', icon: '🥇' },
  { name: 'Platinum', min: 1500, max: 2999, color: '#0ea5e9', icon: '💎' },
  { name: 'Diamond', min: 3000, max: Infinity, color: '#7c3aed', icon: '👑' },
]

const FAQ = [
  {
    q: 'Tích điểm như thế nào?',
    a: 'Cứ mỗi 10.000đ chi tiêu tại Lunexa Movix, bạn nhận được 1 điểm. Điểm được tính cho vé phim, combo đồ ăn và dịch vụ tại rạp.'
  },
  {
    q: 'Điểm có hết hạn không?',
    a: 'Điểm tích lũy có hiệu lực trong 12 tháng kể từ ngày phát sinh. Nếu không có giao dịch trong vòng 6 tháng, điểm sẽ bị đặt lại.'
  },
  {
    q: 'Cách đổi điểm lấy thưởng?',
    a: 'Vào mục "Đổi thưởng", chọn phần thưởng mong muốn và xác nhận. Mã voucher sẽ được gửi về email và hiển thị trong "Voucher của tôi".'
  },
  {
    q: 'Lên hạng thành viên như thế nào?',
    a: 'Hạng được tính theo tổng điểm tích lũy: Silver (0–499), Gold (500–1499), Platinum (1500–2999), Diamond (3000+). Hạng cập nhật tự động.'
  },
  {
    q: 'Mã thành viên dùng để làm gì?',
    a: 'Mã thành viên là định danh duy nhất của bạn. Xuất trình tại quầy để được hưởng ưu đãi hoặc liên kết với nhân viên khi cần hỗ trợ.'
  },
]

function getTier(points) {
  return TIERS.find(t => points >= t.min && points <= t.max) || TIERS[0]
}

function getNextTier(points) {
  const idx = TIERS.findIndex(t => points >= t.min && points <= t.max)
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null
}

export default function Membership() {
  const profile = useSelector((state) => state.user.profile)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedCode, setCopiedCode] = useState(null)
  const [openFaq, setOpenFaq] = useState(null)

  // Mock data cho user
  const memberCode = profile ? `LNX-${String(profile.id || 10001).padStart(6, '0')}` : 'LNX-010001'
  const memberName = profile?.name || 'Khách hàng'
  const totalPoints = 720
  const tier = getTier(totalPoints)
  const nextTier = getNextTier(totalPoints)
  const progress = nextTier
    ? Math.round(((totalPoints - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const TABS = [
    { key: 'overview', label: 'Tổng quan', icon: <MdCardMembership /> },
    { key: 'rewards', label: 'Đổi thưởng', icon: <FaGift /> },
    { key: 'vouchers', label: 'Voucher của tôi', icon: <FaTicketAlt /> },
    { key: 'benefits', label: 'Ưu đãi thành viên', icon: <MdLocalOffer /> },
    { key: 'history', label: 'Lịch sử điểm', icon: <FaHistory /> },
    { key: 'guide', label: 'Hướng dẫn', icon: <FaInfoCircle /> },
  ]

  return (
    <div className='membership-page'>
      {/* Hero banner */}
      <div className='membership-hero' style={{ '--tier-color': tier.color }}>
        <div className='membership-hero-bg' />
        <div className='membership-hero-content'>
          <div className='membership-hero-left'>
            <div className='tier-badge' style={{ background: tier.color }}>
              <span>{tier.icon}</span>
              <span>Thành viên {tier.name}</span>
            </div>
            <h1 className='membership-hero-name'>Xin chào, {memberName}!</h1>
            <div className='membership-code-row'>
              <FaCrown className='crown-icon' style={{ color: tier.color }} />
              <span className='membership-code'>{memberCode}</span>
              <button
                className='copy-btn'
                onClick={() => handleCopy(memberCode)}
                title='Sao chép mã'
              >
                <FaCopy />
                {copiedCode === memberCode ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            {nextTier && (
              <div className='tier-progress-wrap'>
                <div className='tier-progress-label'>
                  <span>{tier.icon} {tier.name}</span>
                  <span className='tier-progress-pts'>{totalPoints} / {nextTier.min} điểm</span>
                  <span>{nextTier.icon} {nextTier.name}</span>
                </div>
                <div className='tier-progress-bar'>
                  <div className='tier-progress-fill' style={{ width: `${progress}%`, background: tier.color }} />
                </div>
                <p className='tier-progress-hint'>
                  Cần thêm <strong>{nextTier.min - totalPoints} điểm</strong> để lên hạng {nextTier.name}
                </p>
              </div>
            )}
          </div>
          <div className='membership-hero-right'>
            <div className='points-card'>
              <FaStar className='points-star' style={{ color: tier.color }} />
              <div className='points-value'>{totalPoints.toLocaleString()}</div>
              <div className='points-label'>Điểm tích lũy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='membership-tabs'>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`membership-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className='tab-icon'>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className='membership-content'>

        {/* ===== TỔNG QUAN ===== */}
        {activeTab === 'overview' && (
          <div className='overview-grid'>
            <div className='overview-card card-glass'>
              <div className='ov-card-icon' style={{ background: `${tier.color}22` }}>
                <MdCardMembership style={{ color: tier.color }} />
              </div>
              <div>
                <div className='ov-card-label'>Mã thành viên</div>
                <div className='ov-card-value'>{memberCode}</div>
              </div>
            </div>
            <div className='overview-card card-glass'>
              <div className='ov-card-icon' style={{ background: '#f59e0b22' }}>
                <FaStar style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <div className='ov-card-label'>Điểm tích lũy</div>
                <div className='ov-card-value'>{totalPoints.toLocaleString()} điểm</div>
              </div>
            </div>
            <div className='overview-card card-glass'>
              <div className='ov-card-icon' style={{ background: `${tier.color}22` }}>
                <FaCrown style={{ color: tier.color }} />
              </div>
              <div>
                <div className='ov-card-label'>Hạng thành viên</div>
                <div className='ov-card-value'>{tier.icon} {tier.name}</div>
              </div>
            </div>
            <div className='overview-card card-glass'>
              <div className='ov-card-icon' style={{ background: '#0ea5e922' }}>
                <FaTicketAlt style={{ color: '#0ea5e9' }} />
              </div>
              <div>
                <div className='ov-card-label'>Voucher khả dụng</div>
                <div className='ov-card-value'>{MOCK_VOUCHERS.length} voucher</div>
              </div>
            </div>

            {/* Tất cả hạng */}
            <div className='card-glass tiers-card'>
              <h3>Các hạng thành viên</h3>
              <div className='tiers-list'>
                {TIERS.map(t => (
                  <div key={t.name} className={`tier-item${t.name === tier.name ? ' current' : ''}`}>
                    <span className='tier-item-icon'>{t.icon}</span>
                    <div className='tier-item-info'>
                      <span className='tier-item-name' style={{ color: t.color }}>{t.name}</span>
                      <span className='tier-item-range'>
                        {t.max === Infinity ? `Từ ${t.min.toLocaleString()} điểm` : `${t.min.toLocaleString()} – ${t.max.toLocaleString()} điểm`}
                      </span>
                    </div>
                    {t.name === tier.name && <span className='tier-current-badge' style={{ background: t.color }}>Hạng của bạn</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Giao dịch gần đây */}
            <div className='card-glass recent-card'>
              <h3>Giao dịch gần đây</h3>
              <div className='history-list'>
                {MOCK_HISTORY.slice(0, 4).map(h => (
                  <div key={h.id} className='history-item'>
                    <div className={`history-dot ${h.type}`} />
                    <div className='history-info'>
                      <span className='history-desc'>{h.desc}</span>
                      <span className='history-date'>{h.date}</span>
                    </div>
                    <span className={`history-pts ${h.type}`}>
                      {h.points > 0 ? `+${h.points}` : h.points} điểm
                    </span>
                  </div>
                ))}
              </div>
              <button className='see-all-btn' onClick={() => setActiveTab('history')}>Xem tất cả →</button>
            </div>
          </div>
        )}

        {/* ===== ĐỔI THƯỞNG ===== */}
        {activeTab === 'rewards' && (
          <div className='rewards-section'>
            <div className='rewards-header card-glass'>
              <div>
                <h3>Điểm khả dụng của bạn</h3>
                <p>Đổi điểm lấy vé, combo và nhiều ưu đãi hấp dẫn khác</p>
              </div>
              <div className='rewards-pts-badge'>
                <FaStar />
                <span>{totalPoints.toLocaleString()} điểm</span>
              </div>
            </div>
            <div className='rewards-grid'>
              {MOCK_REWARDS.map(r => (
                <div key={r.id} className='reward-card card-glass'>
                  <div className='reward-icon'>{r.icon}</div>
                  <div className='reward-title'>{r.title}</div>
                  <div className='reward-cost'>
                    <FaStar style={{ color: '#f59e0b' }} />
                    <span>{r.points} điểm</span>
                  </div>
                  <button
                    className={`reward-btn${totalPoints < r.points ? ' disabled' : ''}`}
                    disabled={totalPoints < r.points}
                  >
                    {totalPoints >= r.points ? 'Đổi ngay' : 'Không đủ điểm'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== VOUCHER ===== */}
        {activeTab === 'vouchers' && (
          <div className='vouchers-section'>
            <p className='section-desc'>Voucher của bạn — click sao chép để sử dụng khi đặt vé</p>
            <div className='vouchers-grid'>
              {MOCK_VOUCHERS.map(v => (
                <div key={v.id} className='voucher-card' style={{ '--v-color': v.color }}>
                  <div className='voucher-left' style={{ background: v.color }}>
                    <FaTicketAlt />
                  </div>
                  <div className='voucher-body'>
                    <div className='voucher-title'>{v.title}</div>
                    <div className='voucher-desc'>{v.desc}</div>
                    <div className='voucher-meta'>
                      <span className='voucher-expiry'>HSD: {v.expiry}</span>
                      <button className='voucher-copy-btn' onClick={() => handleCopy(v.code)}>
                        <FaCopy />
                        <span>{copiedCode === v.code ? 'Đã sao chép!' : v.code}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {MOCK_VOUCHERS.length === 0 && (
              <div className='empty-state'>
                <FaTicketAlt />
                <p>Bạn chưa có voucher nào. Đổi điểm hoặc tham gia ưu đãi để nhận voucher!</p>
              </div>
            )}
          </div>
        )}

        {/* ===== ƯU ĐÃI ===== */}
        {activeTab === 'benefits' && (
          <div className='benefits-section'>
            <p className='section-desc'>Đặc quyền dành riêng cho thành viên <strong style={{ color: tier.color }}>{tier.icon} {tier.name}</strong></p>
            <div className='benefits-grid'>
              {MOCK_BENEFITS.map((b, i) => (
                <div key={i} className='benefit-card card-glass'>
                  <div className='benefit-icon'>{b.icon}</div>
                  <div className='benefit-title'>{b.title}</div>
                  <div className='benefit-desc'>{b.desc}</div>
                </div>
              ))}
            </div>

            <div className='benefits-table-wrap card-glass'>
              <h3>So sánh quyền lợi theo hạng</h3>
              <div className='benefits-table'>
                <div className='bt-head'>
                  <span>Quyền lợi</span>
                  {TIERS.map(t => (
                    <span key={t.name} style={{ color: t.color }}>{t.icon} {t.name}</span>
                  ))}
                </div>
                {[
                  ['Đặt vé ưu tiên', '✕', '✓', '✓', '✓'],
                  ['Giảm giá combo', '✕', '10%', '15%', '20%'],
                  ['Điểm nhân đôi thứ 3', '✕', '✕', '✓', '✓'],
                  ['Quà sinh nhật', '✕', '✓', '✓', '✓'],
                  ['Xem phim sớm', '✕', '✕', '✓', '✓'],
                  ['Bãi đậu xe miễn phí', '✕', '✕', '✕', '✓'],
                ].map((row, i) => (
                  <div key={i} className={`bt-row${i % 2 === 0 ? ' even' : ''}`}>
                    {row.map((cell, j) => (
                      <span key={j} className={j === 0 ? 'bt-feature' : cell === '✕' ? 'bt-no' : 'bt-yes'}>{cell}</span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== LỊCH SỬ ĐIỂM ===== */}
        {activeTab === 'history' && (
          <div className='history-section'>
            <div className='history-summary card-glass'>
              <div className='hs-item earn'>
                <FaStar />
                <div>
                  <div className='hs-label'>Tổng điểm đã kiếm</div>
                  <div className='hs-value'>+{MOCK_HISTORY.filter(h => h.points > 0).reduce((s, h) => s + h.points, 0)} điểm</div>
                </div>
              </div>
              <div className='hs-divider' />
              <div className='hs-item spend'>
                <FaGift />
                <div>
                  <div className='hs-label'>Tổng điểm đã dùng</div>
                  <div className='hs-value'>{MOCK_HISTORY.filter(h => h.points < 0).reduce((s, h) => s + h.points, 0)} điểm</div>
                </div>
              </div>
              <div className='hs-divider' />
              <div className='hs-item bonus'>
                <FaCrown />
                <div>
                  <div className='hs-label'>Điểm hiện có</div>
                  <div className='hs-value'>{totalPoints.toLocaleString()} điểm</div>
                </div>
              </div>
            </div>

            <div className='card-glass history-full'>
              <h3>Tất cả giao dịch</h3>
              <div className='history-list'>
                {MOCK_HISTORY.map(h => (
                  <div key={h.id} className='history-item'>
                    <div className={`history-dot ${h.type}`} />
                    <div className='history-info'>
                      <span className='history-desc'>{h.desc}</span>
                      <span className='history-date'>{h.date}</span>
                    </div>
                    <span className={`history-pts ${h.type}`}>
                      {h.points > 0 ? `+${h.points}` : h.points} điểm
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== HƯỚNG DẪN ===== */}
        {activeTab === 'guide' && (
          <div className='guide-section'>
            <div className='guide-steps card-glass'>
              <h3>Hướng dẫn tích điểm</h3>
              <div className='steps-list'>
                {[
                  { step: 1, title: 'Đăng nhập tài khoản', desc: 'Đảm bảo đăng nhập trước khi đặt vé để điểm được ghi nhận tự động.' },
                  { step: 2, title: 'Đặt vé & thanh toán', desc: 'Cứ mỗi 10.000đ chi tiêu, bạn nhận 1 điểm tích lũy.' },
                  { step: 3, title: 'Điểm được cộng tự động', desc: 'Điểm cộng ngay sau khi giao dịch hoàn tất, kiểm tra trong Lịch sử điểm.' },
                  { step: 4, title: 'Nhân đôi điểm thứ 3', desc: 'Đặt vé vào thứ 3 hàng tuần để nhận điểm x2 (áp dụng từ hạng Platinum).' },
                ].map(s => (
                  <div key={s.step} className='step-item'>
                    <div className='step-num'>{s.step}</div>
                    <div className='step-body'>
                      <div className='step-title'>{s.title}</div>
                      <div className='step-desc'>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='guide-redeem card-glass'>
              <h3>Hướng dẫn đổi điểm</h3>
              <div className='steps-list'>
                {[
                  { step: 1, title: 'Vào tab "Đổi thưởng"', desc: 'Xem danh sách phần thưởng và số điểm cần thiết.' },
                  { step: 2, title: 'Chọn phần thưởng', desc: 'Nhấn "Đổi ngay" nếu bạn đủ điểm. Hệ thống sẽ trừ điểm ngay lập tức.' },
                  { step: 3, title: 'Nhận voucher', desc: 'Voucher xuất hiện trong mục "Voucher của tôi" và được gửi về email.' },
                  { step: 4, title: 'Sử dụng voucher', desc: 'Nhập mã khi đặt vé hoặc xuất trình tại quầy để được hưởng ưu đãi.' },
                ].map(s => (
                  <div key={s.step} className='step-item'>
                    <div className='step-num'>{s.step}</div>
                    <div className='step-body'>
                      <div className='step-title'>{s.title}</div>
                      <div className='step-desc'>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className='guide-faq card-glass'>
              <h3>Câu hỏi thường gặp</h3>
              {FAQ.map((f, i) => (
                <div key={i} className='faq-item'>
                  <button className='faq-q' onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{f.q}</span>
                    {openFaq === i ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                  {openFaq === i && <div className='faq-a'>{f.a}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
