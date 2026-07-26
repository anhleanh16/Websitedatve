import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaUser, FaEdit, FaLock, FaCamera, FaTicketAlt,
  FaHistory, FaBell, FaCrown, FaHeadset, FaRobot,
  FaChevronRight, FaEye, FaEyeSlash, FaSave, FaTimes,
  FaStar, FaMapMarkerAlt, FaClock, FaCheck, FaQrcode, FaSpinner
} from 'react-icons/fa'
import './profile.css'

/* ── Helpers ── */
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return ''
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}
const formatMoney = (amount) => {
  if (amount == null) return '—'
  return Number(amount).toLocaleString('vi-VN') + 'đ'
}

/* Trạng thái đơn → label + class */
const STATUS_MAP = {
  confirmed:  { label: 'Sắp chiếu',  cls: 'upcoming'   },
  pending:    { label: 'Chờ xác nhận', cls: 'pending'   },
  completed:  { label: 'Hoàn thành', cls: 'done'        },
  cancelled:  { label: 'Đã huỷ',     cls: 'cancelled'  },
  checked_in: { label: 'Đã check-in', cls: 'done'       },
}
const getStatus = (status) => STATUS_MAP[status] || { label: status, cls: '' }

const MOCK_NOTIFS = [
  { id: 1, title: 'Vé xem phim đã xác nhận', desc: 'Vé đã được xác nhận.', time: '2 giờ trước', read: false },
  { id: 2, title: 'Ưu đãi thành viên Gold',  desc: 'Bạn đủ điều kiện nhận voucher sinh nhật 100K.', time: '1 ngày trước', read: false },
  { id: 3, title: 'Phim mới ra mắt',          desc: 'Mở bán vé từ hôm nay.', time: '3 ngày trước', read: true },
  { id: 4, title: 'Điểm tích lũy cập nhật',  desc: '+50 điểm từ giao dịch gần nhất.', time: '5 ngày trước', read: true },
]

const SIDEBAR_ITEMS = [
  { key: 'profile',   label: 'Hồ sơ cá nhân',    icon: <FaUser /> },
  { key: 'edit',      label: 'Chỉnh sửa thông tin', icon: <FaEdit /> },
  { key: 'password',  label: 'Đổi mật khẩu',      icon: <FaLock /> },
  { key: 'avatar',    label: 'Ảnh đại diện',       icon: <FaCamera /> },
  { key: 'tickets',   label: 'Vé của tôi',         icon: <FaTicketAlt /> },
  { key: 'history',   label: 'Lịch sử đặt vé',    icon: <FaHistory /> },
  { key: 'notifs',    label: 'Thông báo',           icon: <FaBell /> },
  { key: 'member',    label: 'Thành viên',          icon: <FaCrown />, link: '/Membership' },
  { key: 'support',   label: 'Hỗ trợ',             icon: <FaHeadset /> },
  { key: 'ai',        label: 'Chatbox AI',          icon: <FaRobot />, link: '/ai-assistant' },
]

export default function Profile() {
  const profile  = useSelector((s) => s.user.profile)
  const navigate = useNavigate()

  const [tab,        setTab]        = useState('profile')
  const [avatarSrc,  setAvatarSrc]  = useState(null)
  const [notifs,     setNotifs]     = useState(MOCK_NOTIFS)
  const [saved,      setSaved]      = useState(false)
  const [pointsSummary, setPointsSummary] = useState(null)

  /* bookings */
  const [bookings,      setBookings]      = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError,   setBookingsError]   = useState(null)

  /* edit form */
  const [editForm, setEditForm] = useState({
    name:    profile?.name  || 'Nguyễn Văn A',
    email:   profile?.email || 'user@example.com',
    phone:   '0901 234 567',
    dob:     '1999-05-15',
    gender:  'male',
    address: 'Đà Nẵng',
  })

  /* password form */
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false })
  const [pwdMsg,  setPwdMsg]  = useState('')

  const fileRef = useRef(null)

  useEffect(() => {
    const loadPoints = async () => {
      if (!profile?.id) return
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/points/user/${profile.id}`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        })
        if (!res.ok) return
        const data = await res.json()
        setPointsSummary(data)
      } catch (error) {
        console.error('Failed to load points summary', error)
      }
    }

    loadPoints()
  }, [profile?.id])

  /* Load danh sách vé từ CSDL */
  useEffect(() => {
    const loadBookings = async () => {
      if (!profile?.id) return
      setBookingsLoading(true)
      setBookingsError(null)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`/api/user/${profile.id}/bookings`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        })
        if (!res.ok) throw new Error('Không thể tải danh sách vé')
        const data = await res.json()
        setBookings(data.bookings || [])
      } catch (err) {
        console.error('Failed to load bookings', err)
        setBookingsError(err.message)
      } finally {
        setBookingsLoading(false)
      }
    }
    loadBookings()
  }, [profile?.id])

  const handleEditChange = (e) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSaveEdit = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handlePwdChange = (e) => setPwdForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSavePwd = (e) => {
    e.preventDefault()
    if (pwdForm.next !== pwdForm.confirm) { setPwdMsg('Mật khẩu xác nhận không khớp.'); return }
    if (pwdForm.next.length < 6)          { setPwdMsg('Mật khẩu mới phải ít nhất 6 ký tự.'); return }
    setPwdMsg('success')
    setPwdForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwdMsg(''), 3000)
  }

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setAvatarSrc(url)
  }

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })))
  const unreadCount = notifs.filter(n => !n.read).length

  const handleTabClick = (item) => {
    if (item.link) { navigate(item.link); return }
    setTab(item.key)
  }

  const userName  = profile?.name  || editForm.name
  const userEmail = profile?.email || editForm.email
  const userInitial = userName?.[0]?.toUpperCase() || 'U'
  const totalPoints = pointsSummary?.user?.points ?? 0
  const tierName = pointsSummary?.user?.tier?.name || 'Silver'

  /* Thống kê từ bookings thực */
  const totalBookings   = bookings.length
  const completedMovies = bookings.filter(b => ['completed', 'checked_in'].includes(b.status)).length
  /* Vé sắp chiếu: trạng thái confirmed và suất chiếu chưa qua */
  const upcomingTickets = bookings.filter(b =>
    b.status === 'confirmed' && new Date(b.start_time) > new Date()
  )
  /* Lịch sử: tất cả trừ vé đang confirmed tương lai */
  const historyBookings = bookings.filter(b =>
    b.status !== 'confirmed' || new Date(b.start_time) <= new Date()
  )

  return (
    <div className='profile-page'>

      {/* ══ SIDEBAR ══ */}
      <aside className='profile-sidebar'>
        {/* User summary */}
        <div className='ps-user'>
          <div className='ps-avatar' onClick={() => setTab('avatar')}>
            {avatarSrc
              ? <img src={avatarSrc} alt='avatar' />
              : <span>{userInitial}</span>}
            <div className='ps-avatar-overlay'><FaCamera /></div>
          </div>
          <div className='ps-user-info'>
            <div className='ps-name'>{userName}</div>
            <div className='ps-email'>{userEmail}</div>
            <div className='ps-tier'><FaCrown style={{ color: '#f59e0b' }} /> Thành viên {tierName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className='ps-nav'>
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.key}
              className={`ps-nav-item${tab === item.key ? ' active' : ''}`}
              onClick={() => handleTabClick(item)}
            >
              <span className='ps-nav-icon'>{item.icon}</span>
              <span className='ps-nav-label'>{item.label}</span>
              {item.key === 'notifs' && unreadCount > 0 && (
                <span className='ps-badge'>{unreadCount}</span>
              )}
              <FaChevronRight className='ps-nav-arrow' />
            </button>
          ))}
        </nav>
      </aside>

      {/* ══ CONTENT ══ */}
      <main className='profile-content'>

        {/* ── HỒ SƠ CÁ NHÂN ── */}
        {tab === 'profile' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaUser />
              <h2>Hồ sơ cá nhân</h2>
            </div>
            <div className='profile-info-grid'>
              <div className='pi-card'>
                <div className='pi-avatar-big'>
                  {avatarSrc ? <img src={avatarSrc} alt='avatar' /> : <span>{userInitial}</span>}
                </div>
                <div className='pi-name'>{userName}</div>
                <div className='pi-role'>Thành viên {tierName} · {totalPoints.toLocaleString()} điểm</div>
                <button className='pi-edit-btn' onClick={() => setTab('edit')}>
                  <FaEdit /> Chỉnh sửa
                </button>
              </div>
              <div className='pi-details'>
                {[
                  { label: 'Họ và tên',     value: editForm.name },
                  { label: 'Email',          value: editForm.email },
                  { label: 'Số điện thoại', value: editForm.phone },
                  { label: 'Ngày sinh',      value: new Date(editForm.dob).toLocaleDateString('vi-VN') },
                  { label: 'Giới tính',      value: editForm.gender === 'male' ? 'Nam' : editForm.gender === 'female' ? 'Nữ' : 'Khác' },
                  { label: 'Địa chỉ',        value: editForm.address },
                ].map(row => (
                  <div key={row.label} className='pi-row'>
                    <span className='pi-label'>{row.label}</span>
                    <span className='pi-value'>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats strip */}
            <div className='profile-stats'>
              {[
                { icon: <FaTicketAlt />, num: totalBookings,              label: 'Vé đã đặt',      color: '#7c3aed' },
                { icon: <FaStar />,      num: totalPoints.toLocaleString(), label: 'Điểm tích lũy', color: '#f59e0b' },
                { icon: <FaHistory />,   num: completedMovies,             label: 'Phim đã xem',    color: '#0ea5e9' },
                { icon: <FaCrown />,     num: tierName,                    label: 'Hạng thành viên', color: '#f59e0b' },
              ].map((s, i) => (
                <div key={i} className='pstat-card'>
                  <span className='pstat-icon' style={{ color: s.color, background: s.color + '22' }}>{s.icon}</span>
                  <span className='pstat-num'>{s.num}</span>
                  <span className='pstat-label'>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CHỈNH SỬA ── */}
        {tab === 'edit' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaEdit />
              <h2>Chỉnh sửa thông tin</h2>
            </div>
            <form className='edit-form' onSubmit={handleSaveEdit}>
              <div className='edit-grid'>
                <div className='ef-field'>
                  <label>Họ và tên</label>
                  <input name='name' value={editForm.name} onChange={handleEditChange} placeholder='Họ và tên' />
                </div>
                <div className='ef-field'>
                  <label>Email</label>
                  <input name='email' type='email' value={editForm.email} onChange={handleEditChange} placeholder='Email' />
                </div>
                <div className='ef-field'>
                  <label>Số điện thoại</label>
                  <input name='phone' value={editForm.phone} onChange={handleEditChange} placeholder='Số điện thoại' />
                </div>
                <div className='ef-field'>
                  <label>Ngày sinh</label>
                  <input name='dob' type='date' value={editForm.dob} onChange={handleEditChange} />
                </div>
                <div className='ef-field'>
                  <label>Giới tính</label>
                  <select name='gender' value={editForm.gender} onChange={handleEditChange}>
                    <option value='male'>Nam</option>
                    <option value='female'>Nữ</option>
                    <option value='other'>Khác</option>
                  </select>
                </div>
                <div className='ef-field'>
                  <label>Địa chỉ</label>
                  <input name='address' value={editForm.address} onChange={handleEditChange} placeholder='Địa chỉ' />
                </div>
              </div>
              <button type='submit' className={`save-btn${saved ? ' saved' : ''}`}>
                {saved ? <><FaCheck /> Đã lưu!</> : <><FaSave /> Lưu thay đổi</>}
              </button>
            </form>
          </div>
        )}

        {/* ── ĐỔI MẬT KHẨU ── */}
        {tab === 'password' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaLock />
              <h2>Đổi mật khẩu</h2>
            </div>
            <form className='pwd-form' onSubmit={handleSavePwd}>
              {[
                { name: 'current', label: 'Mật khẩu hiện tại',  ph: 'Nhập mật khẩu hiện tại' },
                { name: 'next',    label: 'Mật khẩu mới',        ph: 'Nhập mật khẩu mới' },
                { name: 'confirm', label: 'Xác nhận mật khẩu',   ph: 'Nhập lại mật khẩu mới' },
              ].map(f => (
                <div key={f.name} className='ef-field'>
                  <label>{f.label}</label>
                  <div className='input-pwd-wrap'>
                    <input
                      name={f.name}
                      type={showPwd[f.name] ? 'text' : 'password'}
                      value={pwdForm[f.name]}
                      onChange={handlePwdChange}
                      placeholder={f.ph}
                      required
                    />
                    <button type='button' className='eye-btn' onClick={() => setShowPwd(p => ({ ...p, [f.name]: !p[f.name] }))}>
                      {showPwd[f.name] ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
              ))}

              {pwdMsg && (
                <div className={`pwd-msg ${pwdMsg === 'success' ? 'success' : 'error'}`}>
                  {pwdMsg === 'success' ? '✅ Đổi mật khẩu thành công!' : `⚠️ ${pwdMsg}`}
                </div>
              )}

              <div className='pwd-tips'>
                <p>Mật khẩu mạnh nên có:</p>
                <ul>
                  <li>Ít nhất 8 ký tự</li>
                  <li>Chữ hoa và chữ thường</li>
                  <li>Số và ký tự đặc biệt</li>
                </ul>
              </div>

              <button type='submit' className='save-btn'>
                <FaLock /> Cập nhật mật khẩu
              </button>
            </form>
          </div>
        )}

        {/* ── ẢNH ĐẠI DIỆN ── */}
        {tab === 'avatar' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaCamera />
              <h2>Ảnh đại diện</h2>
            </div>
            <div className='avatar-section'>
              <div className='avatar-preview-big'>
                {avatarSrc
                  ? <img src={avatarSrc} alt='avatar' />
                  : <span className='avatar-placeholder-big'>{userInitial}</span>}
              </div>
              <div className='avatar-actions'>
                <p>Ảnh đại diện nên có kích thước tối thiểu 200×200px, định dạng JPG hoặc PNG, tối đa 2MB.</p>
                <input ref={fileRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleAvatarFile} />
                <button className='save-btn' onClick={() => fileRef.current?.click()}>
                  <FaCamera /> Chọn ảnh từ thiết bị
                </button>
                {avatarSrc && (
                  <button className='remove-btn' onClick={() => setAvatarSrc(null)}>
                    <FaTimes /> Xoá ảnh
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VÉ CỦA TÔI ── */}
        {tab === 'tickets' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaTicketAlt />
              <h2>Vé của tôi</h2>
            </div>

            {bookingsLoading && (
              <div className='booking-loading'><FaSpinner className='spin' /> Đang tải vé...</div>
            )}
            {bookingsError && (
              <div className='booking-error'>⚠️ {bookingsError}</div>
            )}
            {!bookingsLoading && !bookingsError && upcomingTickets.length === 0 && (
              <div className='booking-empty'>Bạn chưa có vé nào sắp chiếu.</div>
            )}

            <div className='tickets-list'>
              {upcomingTickets.map(t => {
                const st = getStatus(t.status)
                const roomType = t.room_type || '2D'
                return (
                  <div key={t.booking_id} className='ticket-card'>
                    <div className='ticket-left'>
                      <div className='ticket-movie'>{t.movie_title}</div>
                      <div className='ticket-meta'>
                        <span><FaMapMarkerAlt /> {t.cinema_name}</span>
                        <span><FaClock /> {formatDate(t.start_time)} – {formatTime(t.start_time)}</span>
                      </div>
                      <div className='ticket-meta'>
                        <span>Ghế: <strong>{t.seat_codes || '—'}</strong></span>
                        <span
                          className='ticket-format'
                          style={{
                            background: roomType === 'IMAX' ? '#f59e0b22' : '#3b82f622',
                            color:      roomType === 'IMAX' ? '#f59e0b'   : '#60a5fa',
                          }}
                        >
                          {roomType}
                        </span>
                      </div>
                      <div className='ticket-meta'>
                        <span>Mã vé: <strong>{t.booking_code}</strong></span>
                      </div>
                    </div>
                    <div className='ticket-right'>
                      <span className={`ticket-status ${st.cls}`}>{st.label}</span>
                      {t.primary_qr_code && (
                        <button className='ticket-qr-btn' title='Xem mã QR'>
                          <FaQrcode /> Xem QR
                        </button>
                      )}
                    </div>
                    <div className='ticket-tear' />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── LỊCH SỬ ── */}
        {tab === 'history' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaHistory />
              <h2>Lịch sử đặt vé</h2>
            </div>

            {bookingsLoading && (
              <div className='booking-loading'><FaSpinner className='spin' /> Đang tải lịch sử...</div>
            )}
            {bookingsError && (
              <div className='booking-error'>⚠️ {bookingsError}</div>
            )}
            {!bookingsLoading && !bookingsError && historyBookings.length === 0 && (
              <div className='booking-empty'>Chưa có lịch sử đặt vé.</div>
            )}

            <div className='history-table-wrap'>
              <table className='history-table'>
                <thead>
                  <tr>
                    <th>Phim</th>
                    <th>Rạp</th>
                    <th>Ngày chiếu</th>
                    <th>Số vé</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {historyBookings.map(h => {
                    const st = getStatus(h.status)
                    return (
                      <tr key={h.booking_id}>
                        <td className='ht-movie'>{h.movie_title}</td>
                        <td>{h.cinema_name}</td>
                        <td>{formatDate(h.start_time)}</td>
                        <td>{h.ticket_count} vé</td>
                        <td className='ht-price'>{formatMoney(h.total_price)}</td>
                        <td>
                          <span className={`ht-status ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── THÔNG BÁO ── */}
        {tab === 'notifs' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaBell />
              <h2>Thông báo</h2>
              {unreadCount > 0 && (
                <button className='mark-read-btn' onClick={markAllRead}>Đánh dấu tất cả đã đọc</button>
              )}
            </div>
            <div className='notifs-list'>
              {notifs.map(n => (
                <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}>
                  <div className={`notif-dot${n.read ? '' : ' active'}`} />
                  <div className='notif-body'>
                    <div className='notif-title'>{n.title}</div>
                    <div className='notif-desc'>{n.desc}</div>
                  </div>
                  <div className='notif-time'>{n.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── HỖ TRỢ ── */}
        {tab === 'support' && (
          <div className='pc-section'>
            <div className='pc-header'>
              <FaHeadset />
              <h2>Hỗ trợ</h2>
            </div>
            <div className='support-grid'>
              {[
                { icon: '📧', title: 'Email hỗ trợ',      desc: 'support@sweetstar.vn', sub: 'Phản hồi trong 24 giờ' },
                { icon: '📞', title: 'Hotline',            desc: '1800 6868',          sub: 'Miễn phí 8:00–22:00 hàng ngày' },
                { icon: '💬', title: 'Live Chat',          desc: 'Chat trực tiếp',     sub: 'Thường online 9:00–21:00' },
                { icon: '📍', title: 'Văn phòng Đà Nẵng', desc: '123 Nguyễn Văn Linh', sub: 'Thứ 2–6: 8:00–17:00' },
              ].map((s, i) => (
                <div key={i} className='support-card'>
                  <span className='support-icon'>{s.icon}</span>
                  <div className='support-title'>{s.title}</div>
                  <div className='support-desc'>{s.desc}</div>
                  <div className='support-sub'>{s.sub}</div>
                </div>
              ))}
            </div>

            <div className='support-faq'>
              <h3>Câu hỏi thường gặp</h3>
              {[
                { q: 'Làm sao để đổi / huỷ vé?',        a: 'Vào mục "Vé của tôi", chọn vé cần huỷ và nhấn Huỷ vé. Lưu ý huỷ trước 2 giờ so với giờ chiếu.' },
                { q: 'Điểm tích lũy được tính thế nào?', a: 'Cứ 10.000đ chi tiêu nhận 1 điểm. Điểm được cộng ngay sau giao dịch hoàn tất.' },
                { q: 'Tôi quên mật khẩu phải làm sao?',  a: 'Vào trang Đăng nhập → Quên mật khẩu → nhập email để nhận link reset.' },
              ].map((f, i) => (
                <details key={i} className='faq-details'>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
