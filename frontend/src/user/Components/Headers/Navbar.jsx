import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  FaBell, FaSearch, FaUser, FaFilm, FaHome,
  FaMapMarkerAlt, FaCrown, FaNewspaper, FaTimes, FaChevronDown
} from 'react-icons/fa'
import { markAsRead, markAllAsRead, deleteNotification, setNotifications } from '../../../redux/slices/notificationSlice'
import { setSelectedCinema } from '../../../redux/slices/cinemaSlice'
import { clearUser } from '../../../redux/slices/userSlice'
import { userCinemaService, userNotificationService, userMovieService } from '../../services/userApi'
import './nav.css'

const NAV_ITEMS = [
  { to: '/',           label: 'Trang chủ',  icon: <FaHome /> },
  { to: '/Films/Film', label: 'Phim',       icon: <FaFilm /> },
  { to: '/cinemas',    label: 'Rạp chiếu',  icon: <FaMapMarkerAlt /> },
  { to: '/Membership', label: 'Thành viên', icon: <FaCrown /> },
  { to: '/News',       label: 'Tin tức',    icon: <FaNewspaper /> },
  { to: '/blog',       label: 'Blog',       icon: <FaNewspaper /> },
]

const NOTIF_ICONS = { ticket: '🎟️', promo: '🎁', movie: '🎬', points: '⭐', system: '⚙️' }

export default function Navbar() {
  const profile       = useSelector((s) => s.user.profile)
  const notifications = useSelector((s) => s.notifications.items)
  const selectedCinema = useSelector((s) => s.cinema.selectedCinema)
  const unreadCount   = notifications.filter(n => !n.read).length

  const location = useLocation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const role = String(profile?.role || '').toLowerCase()
  const isAdmin = role === 'admin'
  const isAdminPanelUser = ['admin', 'staff', 'manager', 'technician'].includes(role)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchSuggestions, setSearchSuggestions] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef(null)
  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [cinemaOpen,   setCinemaOpen]   = useState(false)
  const [cinemas,      setCinemas]      = useState([])
  const [cinemaError,  setCinemaError]  = useState('')
  const [bellOpen,     setBellOpen]     = useState(false)
  const [emailAlertDismissed, setEmailAlertDismissed] = useState(false)

  const dropdownRef = useRef(null)
  const searchRef   = useRef(null)
  const regionRef   = useRef(null)
  const bellRef     = useRef(null)
  const inputRef    = useRef(null)

  /* scroll effect */
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    setEmailAlertDismissed(false)
  }, [profile?.id, profile?.email, profile?.email_verified])

  /* close panels on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
      if (searchRef.current   && !searchRef.current.contains(e.target))   setSearchOpen(false)
      if (regionRef.current   && !regionRef.current.contains(e.target))   setCinemaOpen(false)
      if (bellRef.current     && !bellRef.current.contains(e.target))     setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* focus search input */
  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus()
      // Load suggestions (tất cả phim, xáo trộn) khi mở search
      if (searchSuggestions.length === 0) {
        userMovieService.getAll()
          .then(d => {
            const all = Array.isArray(d?.movies) ? d.movies : []
            // Xáo trộn Fisher-Yates
            const shuffled = [...all]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            setSearchSuggestions(shuffled.slice(0, 6))
          })
          .catch(() => {})
      }
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [searchOpen])

  /* Debounce search khi gõ */
  useEffect(() => {
    clearTimeout(searchDebounceRef.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const data = await userMovieService.getAll()
        const all = Array.isArray(data?.movies) ? data.movies : []
        const q = searchQuery.toLowerCase()
        const filtered = all.filter(m =>
          m.title?.toLowerCase().includes(q)
        ).slice(0, 6)
        setSearchResults(filtered)
        // Xáo trộn lại suggestions mỗi lần gõ
        const shuffled = [...all]
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
        }
        setSearchSuggestions(shuffled.slice(0, 6))
      } catch {}
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(searchDebounceRef.current)
  }, [searchQuery])

  /* close drawer on route change */
  useEffect(() => { setMobileOpen(false); setBellOpen(false) }, [location.pathname])

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    dispatch(clearUser())
    setDropdownOpen(false)
    navigate('/')
  }

  const userInitial = profile?.name?.[0]?.toUpperCase() || <FaUser />
  const userName    = profile?.name || 'Tài khoản'
  const userId = profile?.id
  const displayCinema = selectedCinema?.city || 'Khu vực'
  const emailUnlinked = Boolean(profile && !profile.email)
  const emailNeedsVerification = Boolean(profile?.email) && profile?.email_verified === false
  const guestNeedsAuthentication = !profile

  const normalizeNotifications = (items = []) =>
    items.map((n) => ({
      id: n.notification_id,
      type: n.type || 'system',
      title: n.title,
      desc: n.content,
      time: new Date(n.created_at).toLocaleString('vi-VN'),
      read: Boolean(n.is_read),
    }))

  // Group cinemas by city
  const groupedCinemas = useMemo(() => {
    const groups = {}
    cinemas.forEach(c => {
      const city = c.city || c.cinema_name
      if (!groups[city]) {
        groups[city] = []
      }
      groups[city].push(c)
    })
    return Object.entries(groups).map(([city, list]) => ({ city, cinemasList: list }))
  }, [cinemas])

  useEffect(() => {
    const loadNotifications = async () => {
      if (!userId) {
        dispatch(setNotifications([]))
        return
      }

      try {
        const data = await userNotificationService.getAll(userId)
        dispatch(setNotifications(normalizeNotifications(data?.notifications || [])))
      } catch (err) {
        console.error(err)
      }
    }

    loadNotifications()
  }, [dispatch, userId])

  useEffect(() => {
    let ignore = false
    const load = async () => {
      setCinemaError('')
      try {
        const data = await userCinemaService.getAll()
        if (ignore) return
        const list = Array.isArray(data?.cinemas) ? data.cinemas : []
        setCinemas(list)
        
        // Auto-select first city if not selected
        if (!selectedCinema && list.length > 0) {
          dispatch(setSelectedCinema({ id: list[0].cinemas_id, name: list[0].cinema_name, city: list[0].city }))
        }
      } catch (err) {
        if (ignore) return
        console.error(err)
        setCinemas([])
        setCinemaError('Không tải được danh sách rạp')
      }
    }
    load()
    return () => { ignore = true }
  }, [])

  const handleSelectCinema = (cinema) => {
    dispatch(setSelectedCinema({ id: cinema.cinemas_id, name: cinema.cinema_name, city: cinema.city }))
    setCinemaOpen(false)
  }

  return (
    <header className={`navbar-container${scrolled ? ' scrolled' : ''}${(guestNeedsAuthentication || emailUnlinked || emailNeedsVerification) && !emailAlertDismissed ? ' has-email-alert' : ''}`}>

      {/* Logo */}
      <Link to='/' className='nav-logo'>
        <img src='/sweetstar.png' alt='Sweetstar Cinema' />
      </Link>

      {/* Desktop nav */}
      <nav className='nav-menu'>
        <ul className='nav-links'>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className={`nav-link${isActive(item.to) ? ' active' : ''}`}>
                <span className='nav-link-icon'>{item.icon}</span>
                <span>{item.label}</span>
                <span className='nav-link-bar' />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Right side */}
      <div className='nav-right'>

        {(guestNeedsAuthentication || emailUnlinked || emailNeedsVerification) && !emailAlertDismissed && (
          <div className='email-link-alert' role='alert'>
            <span>⚠</span>
            <span>{guestNeedsAuthentication ? 'Bạn chưa đăng nhập hoặc đăng kí. Vui lòng đăng nhập để đặt vé và dùng các tính năng khác.' : emailNeedsVerification ? 'Email đăng kí chưa được xác minh. Vui lòng xác minh để đặt vé và dùng các tính năng khác.' : 'Tài khoản chưa liên kết email. Vui lòng liên kết để đặt vé và dùng các tính năng khác.'}</span>
            {guestNeedsAuthentication ? (
              <div className='email-link-alert-actions'>
                <button type='button' className='email-link-alert-action' onClick={() => navigate('/Logins/Login')}>Đăng nhập</button>
                <span>hoặc</span>
                <button type='button' className='email-link-alert-action' onClick={() => navigate('/Registers/Register')}>Đăng kí</button>
              </div>
            ) : (
              <div className='email-link-alert-actions'>
                <button type='button' className='email-link-alert-action' onClick={() => navigate('/profile?tab=edit')}>
                  {emailNeedsVerification ? 'Xác minh' : 'Liên kết'}
                </button>
              </div>
            )}
            <button type='button' className='email-link-alert-close' onClick={() => setEmailAlertDismissed(true)} aria-label='Đóng thông báo email'>
              <FaTimes />
            </button>
          </div>
        )}

        {/* Nút Quản trị — hiện khi là admin hoặc nhân viên admin panel */}
        {isAdminPanelUser && (
          <Link to='/admin' className='nav-admin-btn'>
            <span>⚙</span>
            <span className='nav-admin-label'>Quản trị</span>
          </Link>
        )}

        {/* Cinema selector */}
        <div ref={regionRef} className={`region-wrap${cinemaOpen ? ' open' : ''}`}>
          <button className='region-btn' onClick={() => setCinemaOpen(v => !v)} aria-label='Chọn rạp'>
            <FaMapMarkerAlt className='region-pin' />
            <span className='region-label'>{displayCinema}</span>
            <FaChevronDown className={`region-caret${cinemaOpen ? ' up' : ''}`} />
          </button>
          <ul className='region-dropdown'>
            <li className='region-dropdown-title'>Chọn khu vực</li>
            {cinemaError && <li className='region-dropdown-title' style={{ color: '#f87171' }}>{cinemaError}</li>}
            {groupedCinemas.map(group => (
              <li key={group.city}>
                <button
                  className={`region-option${selectedCinema?.city === group.city ? ' active' : ''}`}
                  onClick={() => handleSelectCinema(group.cinemasList[0])}
                >
                  <FaMapMarkerAlt />
                  <span style={{ flex: 1, textAlign: 'left' }}>
                    {group.city}
                  </span>
                  {selectedCinema?.city === group.city && <span className='region-check'>✓</span>}
                </button>
              </li>
            ))}
            {!cinemaError && cinemas.length === 0 && (
              <li className='region-dropdown-title'>Chưa có rạp nào</li>
            )}
          </ul>
        </div>

        {/* Search */}
        <div ref={searchRef} className={`search-wrap${searchOpen ? ' open' : ''}`}>
          <input
            ref={inputRef}
            type='text'
            placeholder='Tìm phim...'
            className='search-input'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchOpen(false)
              if (e.key === 'Enter' && searchQuery.trim()) {
                navigate(`/Films/Film?q=${encodeURIComponent(searchQuery.trim())}`)
                setSearchOpen(false)
              }
            }}
          />
          <button
            className='search-toggle'
            onClick={() => setSearchOpen(v => !v)}
            aria-label={searchOpen ? 'Đóng' : 'Tìm kiếm'}
          >
            {searchOpen ? <FaTimes /> : <FaSearch />}
          </button>

          {searchOpen && (
            <div className='search-results search-results-rich'>
              {/* Kết quả tìm kiếm */}
              {searchQuery.trim() && (
                <>
                  <div className='search-section-label'>
                    <FaSearch />
                    {searchLoading
                      ? 'Đang tìm...'
                      : `Kết quả cho "${searchQuery}" (${searchResults.length})`}
                  </div>
                  {!searchLoading && searchResults.length === 0 && (
                    <div className='search-empty'>Không tìm thấy phim nào.</div>
                  )}
                  {searchResults.map(m => (
                    <Link
                      key={m.movie_id}
                      to={`/movie/${m.movie_id}`}
                      className='search-movie-item'
                      onClick={() => setSearchOpen(false)}
                    >
                      <div
                        className='search-movie-poster'
                        style={m.poster ? { backgroundImage: `url(${m.poster})` } : undefined}
                      />
                      <div className='search-movie-info'>
                        <span className='search-movie-title'>{m.title}</span>
                        <span className='search-movie-meta'>
                          {m.status === 'now_showing' ? '🎬 Đang chiếu' : m.status === 'coming_soon' ? '🕐 Sắp chiếu' : ''}
                          {m.duration ? ` · ${m.duration} phút` : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* Đề xuất cho bạn */}
              <div className='search-section-label' style={{ marginTop: searchQuery.trim() ? 10 : 0 }}>
                ✨ Đề xuất cho bạn
              </div>
              {searchSuggestions.map(m => (
                <Link
                  key={m.movie_id}
                  to={`/movie/${m.movie_id}`}
                  className='search-movie-item'
                  onClick={() => setSearchOpen(false)}
                >
                  <div
                    className='search-movie-poster'
                    style={m.poster ? { backgroundImage: `url(${m.poster})` } : undefined}
                  />
                  <div className='search-movie-info'>
                    <span className='search-movie-title'>{m.title}</span>
                    <span className='search-movie-meta'>
                      {m.status === 'now_showing' ? '🎬 Đang chiếu' : m.status === 'coming_soon' ? '🕐 Sắp chiếu' : '✅ Đã chiếu'}
                      {m.duration ? ` · ${m.duration} phút` : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bell */}
        <div ref={bellRef} className={`bell-wrap${bellOpen ? ' open' : ''}`}>
          <button className='nav-icon-btn notif-btn' aria-label='Thông báo' onClick={() => setBellOpen(v => !v)}>
            <FaBell />
            {unreadCount > 0 && (
              <span className='notif-dot'>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          <div className='bell-dropdown'>
            <div className='bell-header'>
              <span className='bell-title'>Thông báo</span>
              {unreadCount > 0 && (
                <button className='bell-mark-all' onClick={async () => {
                  if (!userId) return
                  await userNotificationService.markAllAsRead(userId)
                  dispatch(markAllAsRead())
                }}>
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            <div className='bell-list'>
              {notifications.length === 0 ? (
                <div className='bell-empty'><FaBell /><p>Không có thông báo</p></div>
              ) : (
                notifications.slice(0, 5).map(n => (
                  <div key={n.id}
                    className={`bell-item${n.read ? '' : ' unread'}`}
                    onClick={async () => {
                      if (!n.read && userId) {
                        await userNotificationService.markAsRead(userId, n.id)
                        dispatch(markAsRead(n.id))
                      }
                      setBellOpen(false)
                      navigate('/notifications')
                    }}
                  >
                    <span className='bell-item-icon'>{NOTIF_ICONS[n.type] || '🔔'}</span>
                    <div className='bell-item-body'>
                      <div className='bell-item-title'>{n.title}</div>
                      <div className='bell-item-desc'>{n.desc}</div>
                      <span className='bell-item-time'>{n.time}</span>
                    </div>
                    {!n.read && <span className='bell-item-dot' />}
                    <button className='bell-item-del'
                      onClick={async e => {
                        e.stopPropagation()
                        if (!userId) return
                        await userNotificationService.deleteOne(userId, n.id)
                        dispatch(deleteNotification(n.id))
                      }}
                      aria-label='Xoá'
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))
              )}
            </div>
            <Link to='/notifications' className='bell-footer' onClick={() => setBellOpen(false)}>
              Xem tất cả thông báo →
            </Link>
          </div>
        </div>

        {/* Account dropdown */}
        <div ref={dropdownRef} className={`nav-dropdown${dropdownOpen ? ' open' : ''}`}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <button
            type='button'
            className='account-btn'
            onClick={e => { e.stopPropagation(); setDropdownOpen(v => !v) }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDropdownOpen(v => !v) }
              if (e.key === 'Escape') setDropdownOpen(false)
            }}
            aria-expanded={dropdownOpen}
            aria-haspopup='menu'
          >
            <span className='account-avatar'>{userInitial}</span>
            <span className='account-label'>
              {profile ? `Xin chào, ${profile.name}` : 'Tài khoản'}
            </span>
            <span className={`account-caret${dropdownOpen ? ' up' : ''}`}>▾</span>
          </button>

          <ul className='nav-submenu' role='menu'>
            <div className='nav-submenu-inner'>
              {!profile ? (
                <>
                  <li role='menuitem'>
                    <Link to='/Logins/Login' className='submenu-link'><span>🔑</span> Đăng nhập</Link>
                  </li>
                  <li role='menuitem'>
                    <Link to='/Registers/Register' className='submenu-link'><span>✨</span> Đăng ký</Link>
                  </li>
                </>
              ) : (
                <>
                  <li className='submenu-user-info'>
                    <span className='submenu-avatar'>{userInitial}</span>
                    <div>
                      <div className='submenu-name'>{profile.name}</div>
                      <div className='submenu-email'>{profile.email || 'Chưa liên kết email'}</div>
                    </div>
                  </li>
                  <li className='submenu-divider' />
                  <li role='menuitem'>
                    <Link to='/profile' className='submenu-link'><span>👤</span> Tài khoản cá nhân</Link>
                  </li>
                  <li role='menuitem'>
                    <Link to='/Membership' className='submenu-link'><span>👑</span> Thành viên</Link>
                  </li>
                  {isAdminPanelUser && (
                    <li role='menuitem'>
                      <Link to='/admin' className='submenu-link'><span>⚙️</span> Quản trị</Link>
                    </li>
                  )}
                  <li className='submenu-divider' />
                  <li role='menuitem'>
                    <button className='submenu-link logout' onClick={handleLogout} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <span>🚪</span> Đăng xuất
                    </button>
                  </li>
                </>
              )}
            </div>
          </ul>
        </div>

        {/* Hamburger */}
        <button className={`hamburger${mobileOpen ? ' open' : ''}`} onClick={() => setMobileOpen(v => !v)} aria-label='Menu'>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`mobile-drawer${mobileOpen ? ' open' : ''}`}>
        <div className='mobile-search'>
          <FaSearch className='mobile-search-icon' />
          <input type='text' placeholder='Tìm phim, rạp...' className='mobile-search-input' />
        </div>
        <div className='mobile-region'>
          <FaMapMarkerAlt />
          <span>Rạp:</span>
          <select className='mobile-region-select' value={selectedCinema?.id || ''}
            onChange={e => {
              const c = cinemas.find(x => String(x.cinemas_id) === String(e.target.value))
              if (c) handleSelectCinema(c)
            }}>
            {cinemas.map(c => (
              <option key={c.cinemas_id} value={c.cinemas_id}>{c.cinema_name}</option>
            ))}
          </select>
        </div>
        <ul className='mobile-links'>
          {NAV_ITEMS.map(item => (
            <li key={item.to}>
              <Link to={item.to} className={`mobile-link${isActive(item.to) ? ' active' : ''}`}>
                <span className='mobile-link-icon'>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
          {isAdminPanelUser && (
            <li>
              <Link to='/admin' className='mobile-link'>
                <span className='mobile-link-icon'>⚙</span> Quản trị
              </Link>
            </li>
          )}
        </ul>
        <div className='mobile-auth'>
          {!profile ? (
            <>
              <Link to='/Logins/Login'       className='mobile-auth-btn primary'>Đăng nhập</Link>
              <Link to='/Registers/Register' className='mobile-auth-btn secondary'>Đăng ký</Link>
            </>
          ) : (
            <>
              <Link to='/profile' className='mobile-auth-btn primary'>Tài khoản</Link>
              <button className='mobile-auth-btn secondary' onClick={handleLogout}
                style={{ border: 'none', cursor: 'pointer' }}>
                Đăng xuất
              </button>
            </>
          )}
        </div>
      </div>

      {mobileOpen && <div className='mobile-overlay' onClick={() => setMobileOpen(false)} />}
    </header>
  )
}
