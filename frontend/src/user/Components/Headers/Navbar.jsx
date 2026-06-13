import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  FaBell, FaSearch, FaUser, FaFilm, FaHome,
  FaMapMarkerAlt, FaCrown, FaNewspaper, FaTimes, FaChevronDown
} from 'react-icons/fa'
import { markAsRead, markAllAsRead, deleteNotification } from '../../../redux/slices/notificationSlice'
import { clearUser } from '../../../redux/slices/userSlice'
import './nav.css'

const NAV_ITEMS = [
  { to: '/',           label: 'Trang chủ',  icon: <FaHome /> },
  { to: '/Films/Film', label: 'Phim',       icon: <FaFilm /> },
  { to: '/cinemas',    label: 'Rạp chiếu',  icon: <FaMapMarkerAlt /> },
  { to: '/Membership', label: 'Thành viên', icon: <FaCrown /> },
  { to: '/News',       label: 'Tin tức',    icon: <FaNewspaper /> },
]

const REGIONS = [
  { value: 'dn',  label: 'Đà Nẵng' },
  { value: 'hcm', label: 'TP. Hồ Chí Minh' },
  { value: 'hn',  label: 'Hà Nội' },
  { value: 'hue', label: 'Huế' },
  { value: 'ctn', label: 'Cần Thơ' },
  { value: 'vt',  label: 'Vũng Tàu' },
]

const NOTIF_ICONS = { ticket: '🎟️', promo: '🎁', movie: '🎬', points: '⭐', system: '⚙️' }

export default function Navbar() {
  const profile       = useSelector((s) => s.user.profile)
  const notifications = useSelector((s) => s.notifications.items)
  const unreadCount   = notifications.filter(n => !n.read).length

  const location = useLocation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'admin'

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [regionOpen,   setRegionOpen]   = useState(false)
  const [region,       setRegion]       = useState(REGIONS[0])
  const [bellOpen,     setBellOpen]     = useState(false)

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

  /* close panels on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
      if (searchRef.current   && !searchRef.current.contains(e.target))   setSearchOpen(false)
      if (regionRef.current   && !regionRef.current.contains(e.target))   setRegionOpen(false)
      if (bellRef.current     && !bellRef.current.contains(e.target))     setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* focus search input */
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
    else setSearchQuery('')
  }, [searchOpen])

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

  return (
    <header className={`navbar-container${scrolled ? ' scrolled' : ''}`}>

      {/* Logo */}
      <Link to='/' className='nav-logo'>
        <img src='/logo.png' alt='Lunexa' />
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

        {/* Nút Quản trị — chỉ hiện khi là admin */}
        {isAdmin && (
          <Link to='/admin' className='nav-admin-btn'>
            <span>⚙</span>
            <span className='nav-admin-label'>Quản trị</span>
          </Link>
        )}

        {/* Region */}
        <div ref={regionRef} className={`region-wrap${regionOpen ? ' open' : ''}`}>
          <button className='region-btn' onClick={() => setRegionOpen(v => !v)} aria-label='Chọn khu vực'>
            <FaMapMarkerAlt className='region-pin' />
            <span className='region-label'>{region.label}</span>
            <FaChevronDown className={`region-caret${regionOpen ? ' up' : ''}`} />
          </button>
          <ul className='region-dropdown'>
            <li className='region-dropdown-title'>Chọn khu vực</li>
            {REGIONS.map(r => (
              <li key={r.value}>
                <button
                  className={`region-option${region.value === r.value ? ' active' : ''}`}
                  onClick={() => { setRegion(r); setRegionOpen(false) }}
                >
                  <FaMapMarkerAlt />
                  {r.label}
                  {region.value === r.value && <span className='region-check'>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Search */}
        <div ref={searchRef} className={`search-wrap${searchOpen ? ' open' : ''}`}>
          <input
            ref={inputRef}
            type='text'
            placeholder='Tìm phim, rạp...'
            className='search-input'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
          />
          <button
            className='search-toggle'
            onClick={() => setSearchOpen(v => !v)}
            aria-label={searchOpen ? 'Đóng' : 'Tìm kiếm'}
          >
            {searchOpen ? <FaTimes /> : <FaSearch />}
          </button>
          {searchOpen && searchQuery.length > 0 && (
            <div className='search-results'>
              <div className='search-results-hint'>
                <FaSearch /><span>Kết quả cho "<strong>{searchQuery}</strong>"</span>
              </div>
              <Link to={`/Films/Film?q=${searchQuery}`} className='search-result-item' onClick={() => setSearchOpen(false)}>
                <FaFilm /><span>Tìm phim: <strong>{searchQuery}</strong></span>
              </Link>
              <Link to={`/cinemas?q=${searchQuery}`} className='search-result-item' onClick={() => setSearchOpen(false)}>
                <FaMapMarkerAlt /><span>Tìm rạp: <strong>{searchQuery}</strong></span>
              </Link>
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
                <button className='bell-mark-all' onClick={() => dispatch(markAllAsRead())}>
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
                    onClick={() => { dispatch(markAsRead(n.id)); setBellOpen(false); navigate('/notifications') }}
                  >
                    <span className='bell-item-icon'>{NOTIF_ICONS[n.type] || '🔔'}</span>
                    <div className='bell-item-body'>
                      <div className='bell-item-title'>{n.title}</div>
                      <div className='bell-item-desc'>{n.desc}</div>
                      <span className='bell-item-time'>{n.time}</span>
                    </div>
                    {!n.read && <span className='bell-item-dot' />}
                    <button className='bell-item-del'
                      onClick={e => { e.stopPropagation(); dispatch(deleteNotification(n.id)) }}
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
                      <div className='submenu-email'>{profile.email}</div>
                    </div>
                  </li>
                  <li className='submenu-divider' />
                  <li role='menuitem'>
                    <Link to='/profile' className='submenu-link'><span>👤</span> Tài khoản cá nhân</Link>
                  </li>
                  <li role='menuitem'>
                    <Link to='/Membership' className='submenu-link'><span>👑</span> Thành viên</Link>
                  </li>
                  {isAdmin && (
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
          <span>Khu vực:</span>
          <select className='mobile-region-select' value={region.value}
            onChange={e => setRegion(REGIONS.find(r => r.value === e.target.value))}>
            {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
          {isAdmin && (
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
