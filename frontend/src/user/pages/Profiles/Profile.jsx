import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  FaUser, FaEdit, FaLock, FaCamera, FaTicketAlt,
  FaHistory, FaBell, FaCrown, FaHeadset, FaRobot,
  FaChevronRight, FaEye, FaEyeSlash, FaSave, FaTimes,
  FaStar, FaMapMarkerAlt, FaClock, FaCheck, FaQrcode, FaSpinner,
  FaDownload
} from 'react-icons/fa'
import './profile.css'
import { setUser } from '../../../redux/slices/userSlice'
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from '../../../utils/birthDate'
import {
  userBookingService,
  userNotificationService,
  userProfileService,
} from '../../services/userApi'

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

const formatRelativeTime = (dateStr) => {
  if (!dateStr) return 'Vừa xong'
  const d = new Date(dateStr)
  if (isNaN(d)) return 'Vừa xong'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ngày trước`
  return formatDate(dateStr)
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

const AUDIT_ACTION_LABEL = {
  profile_updated: 'Cập nhật thông tin hồ sơ',
  password_changed: 'Đổi mật khẩu',
  avatar_updated: 'Cập nhật ảnh đại diện',
  avatar_removed: 'Xóa ảnh đại diện',
  email_change_otp_requested: 'Yêu cầu OTP đổi email',
  email_changed_verified: 'Xác minh đổi email thành công',
}

const getAuditLabel = (action) => AUDIT_ACTION_LABEL[action] || action

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
  { key: 'ai',        label: 'Chatbox AI',          icon: <FaRobot />, link: '/?chatbox=1' },
]

export default function Profile() {
  const profile  = useSelector((s) => s.user.profile)
  const tokenFromStore = useSelector((s) => s.user.token)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [tab,        setTab]        = useState('profile')
  const [avatarSrc,  setAvatarSrc]  = useState('')
  const [notifs,     setNotifs]     = useState([])
  const [notifsLoading, setNotifsLoading] = useState(false)
  const [notifsError, setNotifsError] = useState('')
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [pointsSummary, setPointsSummary] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [avatarMsg, setAvatarMsg] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState(profile?.email || '')
  const [emailChange, setEmailChange] = useState({
    pendingEmail: '',
    otpCode: '',
    expiresAt: null,
    loading: false,
    verifyLoading: false,
    message: '',
    error: '',
  })
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [nowTs, setNowTs] = useState(Date.now())

  /* bookings */
  const [bookings,      setBookings]      = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError,   setBookingsError]   = useState(null)
  const [qrModal, setQrModal] = useState(null) // { qrCode, bookingCode, movieTitle, seats, showtime }

  /* edit form */
  const [editForm, setEditForm] = useState({
    name:    profile?.name  || '',
    email:   profile?.email || '',
    phone:   '',
    dob:     '',
    gender:  'male',
  })

  /* password form */
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false })
  const [pwdMsg,  setPwdMsg]  = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  const fileRef = useRef(null)

  useEffect(() => {
    const mapSexToGender = (sex) => {
      if (sex === 'Nam') return 'male'
      if (sex === 'Nu') return 'female'
      if (sex === 'Khac') return 'other'
      return 'male'
    }

    const loadProfile = async () => {
      if (!profile?.id) return
      setProfileLoading(true)
      setProfileError('')
      try {
        const data = await userProfileService.getById(profile.id)
        const user = data?.user
        if (!user) throw new Error('Không thể đọc dữ liệu hồ sơ.')

        setEditForm({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          dob: user.birthday ? String(user.birthday).slice(0, 10) : '',
          gender: mapSexToGender(user.sex),
        })
        setCurrentEmail(user.email || '')
        setEmailChange((prev) => ({
          ...prev,
          pendingEmail: user.pending_email || '',
          expiresAt: user.email_change_expires ? new Date(user.email_change_expires).getTime() : null,
        }))
        setAvatarSrc(user.avatar || '')

        const nextUser = {
          ...(profile || {}),
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          point: user.point,
        }
        dispatch(setUser({ token: tokenFromStore || localStorage.getItem('token'), user: nextUser }))
        localStorage.setItem('user', JSON.stringify(nextUser))
      } catch (error) {
        setProfileError(error.message || 'Không thể tải hồ sơ người dùng.')
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [dispatch, profile?.id, tokenFromStore])

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

  const loadAuditLogs = async () => {
    if (!profile?.id) return
    setAuditLoading(true)
    setAuditError('')
    try {
      const data = await userProfileService.getAuditLogs(profile.id, 15)
      setAuditLogs(Array.isArray(data?.audits) ? data.audits : [])
    } catch (error) {
      setAuditError(error.message || 'Không thể tải lịch sử chỉnh sửa hồ sơ.')
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    loadAuditLogs()
  }, [profile?.id])

  useEffect(() => {
    if (!emailChange.expiresAt) return undefined
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [emailChange.expiresAt])

  /* Load danh sách vé từ CSDL */
  useEffect(() => {
    const loadBookings = async () => {
      if (!profile?.id) return
      setBookingsLoading(true)
      setBookingsError(null)
      try {
        const data = await userBookingService.getAll(profile.id)
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

  useEffect(() => {
    const loadNotifs = async () => {
      if (!profile?.id) return
      setNotifsLoading(true)
      setNotifsError('')
      try {
        const data = await userNotificationService.getAll(profile.id)
        const mapped = Array.isArray(data?.notifications)
          ? data.notifications.map((n) => ({
              id: n.notification_id,
              title: n.title || 'Thông báo',
              desc: n.content || '',
              time: formatRelativeTime(n.created_at),
              read: Boolean(n.is_read),
            }))
          : []
        setNotifs(mapped)
      } catch (error) {
        setNotifsError(error.message || 'Không thể tải thông báo.')
      } finally {
        setNotifsLoading(false)
      }
    }
    loadNotifs()
  }, [profile?.id])

  const handleEditChange = (e) => setEditForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!profile?.id) return
    setSaveError('')
    setSaveMessage('')
    if (editForm.dob && !isValidBirthDate(editForm.dob)) {
      setSaveError(BIRTH_DATE_ERROR)
      return
    }
    try {
      const sex = editForm.gender === 'male' ? 'Nam' : editForm.gender === 'female' ? 'Nu' : 'Khac'
      const normalizedCurrentEmail = String(currentEmail || '').trim().toLowerCase()
      const normalizedNewEmail = String(editForm.email || '').trim().toLowerCase()
      const isEmailChanged = Boolean(normalizedNewEmail && normalizedCurrentEmail !== normalizedNewEmail)

      const response = await userProfileService.update(profile.id, {
        name: editForm.name,
        email: normalizedCurrentEmail,
        phone: editForm.phone,
        birthday: editForm.dob || null,
        sex,
      })

      const updated = response?.user
      if (updated) {
        const nextUser = {
          ...(profile || {}),
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          avatar: updated.avatar,
          point: updated.point,
        }
        dispatch(setUser({ token: tokenFromStore || localStorage.getItem('token'), user: nextUser }))
        localStorage.setItem('user', JSON.stringify(nextUser))
      }

      if (isEmailChanged) {
        setEmailChange((prev) => ({ ...prev, loading: true, error: '', message: '' }))
        const otpResponse = await userProfileService.requestEmailChangeOtp(profile.id, {
          newEmail: normalizedNewEmail,
        })
        const ttlSeconds = Number(otpResponse?.expiresInSeconds || 0)
        setEmailChange((prev) => ({
          ...prev,
          pendingEmail: otpResponse?.pendingEmail || normalizedNewEmail,
          expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
          loading: false,
          verifyLoading: false,
          otpCode: '',
          message: otpResponse?.message || 'Đã gửi OTP đến email mới.',
          error: '',
        }))
        setSaveMessage('Đã lưu thông tin hồ sơ. Email mới cần OTP để xác minh trước khi cập nhật.')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        setSaveMessage('Cập nhật hồ sơ thành công.')
      }

      await loadAuditLogs()
    } catch (error) {
      setEmailChange((prev) => ({ ...prev, loading: false, verifyLoading: false }))
      setSaveError(error.message || 'Không thể cập nhật hồ sơ.')
    }
  }

  const handleConfirmEmailOtp = async (e) => {
    e.preventDefault()
    if (!profile?.id) return
    const code = String(emailChange.otpCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      setEmailChange((prev) => ({ ...prev, error: 'Vui lòng nhập OTP gồm 6 chữ số.', message: '' }))
      return
    }

    try {
      setEmailChange((prev) => ({ ...prev, verifyLoading: true, error: '', message: '' }))
      const response = await userProfileService.confirmEmailChangeOtp(profile.id, { otpCode: code })
      const updated = response?.user
      if (updated) {
        setCurrentEmail(updated.email || '')
        setEditForm((prev) => ({ ...prev, email: updated.email || prev.email }))
        const nextUser = {
          ...(profile || {}),
          id: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          avatar: updated.avatar,
          point: updated.point,
        }
        dispatch(setUser({ token: tokenFromStore || localStorage.getItem('token'), user: nextUser }))
        localStorage.setItem('user', JSON.stringify(nextUser))
      }

      setEmailChange((prev) => ({
        ...prev,
        pendingEmail: '',
        expiresAt: null,
        otpCode: '',
        verifyLoading: false,
        message: response?.message || 'Đổi email thành công.',
        error: '',
      }))
      await loadAuditLogs()
    } catch (error) {
      setEmailChange((prev) => ({
        ...prev,
        verifyLoading: false,
        error: error.message || 'Không thể xác minh OTP.',
        message: '',
      }))
    }
  }

  const handlePwdChange = (e) => setPwdForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSavePwd = async (e) => {
    e.preventDefault()
    if (pwdForm.next !== pwdForm.confirm) { setPwdMsg('Mật khẩu xác nhận không khớp.'); return }
    if (pwdForm.next.length < 6)          { setPwdMsg('Mật khẩu mới phải ít nhất 6 ký tự.'); return }
    if (!profile?.id) return

    try {
      setPwdLoading(true)
      await userProfileService.changePassword(profile.id, {
        currentPassword: pwdForm.current,
        newPassword: pwdForm.next,
      })
      setPwdMsg('success')
      setPwdForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwdMsg(''), 3000)
    } catch (error) {
      setPwdMsg(error.message || 'Không thể đổi mật khẩu lúc này.')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!profile?.id) return

    setAvatarMsg('')
    setAvatarLoading(true)
    try {
      const response = await userProfileService.updateAvatar(profile.id, file)
      const avatar = response?.avatar || ''
      setAvatarSrc(avatar)
      setAvatarMsg('Cập nhật ảnh đại diện thành công.')

      const nextUser = {
        ...(profile || {}),
        avatar,
      }
      dispatch(setUser({ token: tokenFromStore || localStorage.getItem('token'), user: nextUser }))
      localStorage.setItem('user', JSON.stringify(nextUser))
    } catch (error) {
      setAvatarMsg(error.message || 'Không thể cập nhật ảnh đại diện.')
    } finally {
      setAvatarLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!profile?.id) return
    setAvatarMsg('')
    setAvatarLoading(true)
    try {
      await userProfileService.removeAvatar(profile.id)
      setAvatarSrc('')
      setAvatarMsg('Đã xoá ảnh đại diện.')

      const nextUser = {
        ...(profile || {}),
        avatar: '',
      }
      dispatch(setUser({ token: tokenFromStore || localStorage.getItem('token'), user: nextUser }))
      localStorage.setItem('user', JSON.stringify(nextUser))
    } catch (error) {
      setAvatarMsg(error.message || 'Không thể xoá ảnh đại diện.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const markAllRead = async () => {
    if (!profile?.id) return
    try {
      await userNotificationService.markAllAsRead(profile.id)
      setNotifs((n) => n.map((x) => ({ ...x, read: true })))
    } catch (error) {
      setNotifsError(error.message || 'Không thể cập nhật thông báo.')
    }
  }

  const markOneRead = async (notificationId) => {
    if (!profile?.id) return
    try {
      await userNotificationService.markAsRead(profile.id, notificationId)
      setNotifs((prev) => prev.map((x) => (x.id === notificationId ? { ...x, read: true } : x)))
    } catch (error) {
      setNotifsError(error.message || 'Không thể cập nhật trạng thái thông báo.')
    }
  }

  const unreadCount = notifs.filter(n => !n.read).length

  const handleTabClick = (item) => {
    if (item.link) { navigate(item.link); return }
    setTab(item.key)
  }

  const userName  = editForm.name || profile?.name || 'Người dùng'
  const userEmail = editForm.email || profile?.email || ''
  const userInitial = userName?.[0]?.toUpperCase() || 'U'
  const totalPoints = pointsSummary?.user?.points ?? 0
  const tierName = pointsSummary?.user?.tier?.name || 'Silver'
  const emailOtpRemainingSeconds = emailChange.expiresAt
    ? Math.max(0, Math.floor((emailChange.expiresAt - nowTs) / 1000))
    : 0

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

        {profileLoading && (
          <div className='booking-loading'><FaSpinner className='spin' /> Đang tải hồ sơ...</div>
        )}
        {profileError && (
          <div className='booking-error'>⚠️ {profileError}</div>
        )}

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
                  { label: 'Ngày sinh',      value: formatDate(editForm.dob) },
                  { label: 'Giới tính',      value: editForm.gender === 'male' ? 'Nam' : editForm.gender === 'female' ? 'Nữ' : 'Khác' },
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

            <div className='pc-header' style={{ marginTop: 22 }}>
              <FaHistory />
              <h2>Lần chỉnh sửa gần nhất</h2>
            </div>
            <div className='notifs-list'>
              {auditLoading && <div className='booking-loading'><FaSpinner className='spin' /> Đang tải lịch sử chỉnh sửa...</div>}
              {auditError && <div className='booking-error'>⚠️ {auditError}</div>}
              {!auditLoading && !auditError && auditLogs.length === 0 && (
                <div className='booking-empty'>Chưa có lịch sử chỉnh sửa hồ sơ.</div>
              )}
              {auditLogs.map((item) => {
                const changes = item?.field_changes && typeof item.field_changes === 'object'
                  ? Object.keys(item.field_changes)
                  : []
                return (
                  <div key={item.audit_id} className='notif-item'>
                    <div className='notif-dot active' />
                    <div className='notif-body'>
                      <div className='notif-title'>{getAuditLabel(item.action)}</div>
                      <div className='notif-desc'>
                        {changes.length > 0 ? `Trường thay đổi: ${changes.join(', ')}` : 'Không có chi tiết trường thay đổi.'}
                      </div>
                    </div>
                    <div className='notif-time'>{formatRelativeTime(item.created_at)}</div>
                  </div>
                )
              })}
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
                  {emailChange.pendingEmail && (
                    <small style={{ color: '#b45309', marginTop: 6, display: 'block' }}>
                      Đang chờ xác minh OTP cho email mới: {emailChange.pendingEmail}
                    </small>
                  )}
                </div>
                <div className='ef-field'>
                  <label>Số điện thoại</label>
                  <input name='phone' value={editForm.phone} onChange={handleEditChange} placeholder='Số điện thoại' />
                </div>
                <div className='ef-field'>
                  <label>Ngày sinh</label>
                  <input name='dob' type='date' value={editForm.dob} min={getBirthDateBounds().min} max={getBirthDateBounds().max} onChange={handleEditChange} />
                </div>
                <div className='ef-field'>
                  <label>Giới tính</label>
                  <select name='gender' value={editForm.gender} onChange={handleEditChange}>
                    <option value='male'>Nam</option>
                    <option value='female'>Nữ</option>
                    <option value='other'>Khác</option>
                  </select>
                </div>
              </div>
              {saveError && <div className='pwd-msg error'>⚠️ {saveError}</div>}
              {saveMessage && <div className='pwd-msg success'>✅ {saveMessage}</div>}
              <button type='submit' className={`save-btn${saved ? ' saved' : ''}`}>
                {saved ? <><FaCheck /> Đã lưu!</> : <><FaSave /> Lưu thay đổi</>}
              </button>

              {emailChange.pendingEmail && (
                <div style={{ marginTop: 18, border: '1px solid #fcd34d', borderRadius: 12, padding: 16, background: '#fff7ed' }}>
                  <h4 style={{ marginTop: 0, marginBottom: 8 }}>Xác minh đổi email bằng OTP</h4>
                  <p style={{ marginTop: 0, marginBottom: 10, color: '#92400e' }}>
                    Chúng tôi đã gửi OTP đến email mới. Nhập mã để hoàn tất đổi email.
                    {emailOtpRemainingSeconds > 0 ? ` Còn ${emailOtpRemainingSeconds}s.` : ' OTP có thể đã hết hạn, bạn hãy lưu lại để gửi OTP mới.'}
                  </p>

                  <form onSubmit={handleConfirmEmailOtp} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      type='text'
                      value={emailChange.otpCode}
                      onChange={(e) => setEmailChange((prev) => ({ ...prev, otpCode: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                      placeholder='Nhập OTP 6 số'
                      style={{ minWidth: 180, padding: '10px 12px', borderRadius: 8, border: '1px solid #f59e0b' }}
                    />
                    <button type='submit' className='save-btn' disabled={emailChange.verifyLoading}>
                      <FaCheck /> {emailChange.verifyLoading ? 'Đang xác minh...' : 'Xác minh OTP'}
                    </button>
                  </form>

                  {emailChange.error && <div className='pwd-msg error' style={{ marginTop: 10 }}>⚠️ {emailChange.error}</div>}
                  {emailChange.message && <div className='pwd-msg success' style={{ marginTop: 10 }}>✅ {emailChange.message}</div>}
                </div>
              )}
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

              <button type='submit' className='save-btn' disabled={pwdLoading}>
                <FaLock /> {pwdLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
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
                <button className='save-btn' onClick={() => fileRef.current?.click()} disabled={avatarLoading}>
                  <FaCamera /> {avatarLoading ? 'Đang tải ảnh...' : 'Chọn ảnh từ thiết bị'}
                </button>
                {avatarSrc && (
                  <button className='remove-btn' onClick={handleRemoveAvatar} disabled={avatarLoading}>
                    <FaTimes /> Xoá ảnh
                  </button>
                )}
                {avatarMsg && (
                  <div className={`pwd-msg ${avatarMsg.includes('thành công') ? 'success' : 'error'}`}>
                    {avatarMsg.includes('thành công') ? '✅ ' : '⚠️ '}{avatarMsg}
                  </div>
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
                        <button
                          className='ticket-qr-btn'
                          title='Xem mã QR'
                          onClick={() => setQrModal({
                            qrCode:      t.primary_qr_code,
                            bookingCode: t.booking_code,
                            movieTitle:  t.movie_title,
                            cinema:      t.cinema_name,
                            seats:       t.seat_codes || '—',
                            showtime:    `${formatDate(t.start_time)} – ${formatTime(t.start_time)}`,
                            roomType:    t.room_type || '2D',
                          })}
                        >
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
              {notifsLoading && <div className='booking-loading'><FaSpinner className='spin' /> Đang tải thông báo...</div>}
              {notifsError && <div className='booking-error'>⚠️ {notifsError}</div>}
              {!notifsLoading && !notifsError && notifs.length === 0 && (
                <div className='booking-empty'>Bạn chưa có thông báo nào.</div>
              )}
              {notifs.map(n => (
                <div key={n.id} className={`notif-item${n.read ? '' : ' unread'}`} onClick={() => markOneRead(n.id)}>
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

      {/* ── QR Modal ── */}
      {qrModal && (
        <div className='qr-modal-overlay' onClick={() => setQrModal(null)}>
          <div className='qr-modal' onClick={e => e.stopPropagation()}>
            <button className='qr-modal-close' onClick={() => setQrModal(null)}>
              <FaTimes />
            </button>

            <div className='qr-modal-header'>
              <FaQrcode className='qr-modal-icon' />
              <h2>Mã QR Check-in</h2>
            </div>

            <div className='qr-modal-info'>
              <div className='qr-info-row'><span>Phim</span><strong>{qrModal.movieTitle}</strong></div>
              <div className='qr-info-row'><span>Rạp</span><strong>{qrModal.cinema}</strong></div>
              <div className='qr-info-row'><span>Suất chiếu</span><strong>{qrModal.showtime}</strong></div>
              <div className='qr-info-row'><span>Ghế</span><strong>{qrModal.seats}</strong></div>
              <div className='qr-info-row'><span>Định dạng</span><strong>{qrModal.roomType}</strong></div>
            </div>

            <div className='qr-modal-code-wrap'>
              <img
                className='qr-modal-img'
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrModal.qrCode)}&bgcolor=ffffff&color=1a1a2e&margin=2`}
                alt='QR Code vé'
              />
              <p className='qr-modal-code-text'>{qrModal.bookingCode}</p>
            </div>

            <p className='qr-modal-hint'>
              📱 Xuất trình mã QR này tại quầy check-in của rạp
            </p>

            <a
              className='qr-modal-download'
              href={`https://api.qrserver.com/v1/create-qr-code/?size=480x480&data=${encodeURIComponent(qrModal.qrCode)}&bgcolor=ffffff&color=1a1a2e&margin=4`}
              download={`ve-${qrModal.bookingCode}.png`}
              target='_blank'
              rel='noreferrer'
            >
              <FaDownload /> Tải QR về máy
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
