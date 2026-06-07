import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  FaBell, FaSearch, FaUser, FaFilm, FaHome,
  FaMapMarkerAlt, FaCrown, FaNewspaper, FaTimes, FaChevronDown
} from 'react-icons/fa'
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

export default function Navbar() {
  const profile  = useSelector((state) => state.user.profile)
  const location = useLocation()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchOpen,   setSearchOpen]   = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [scrolled,     setScrolled]     = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [regionOpen,   setRegionOpen]   = useState(false)
  const [region,       setRegion]       = useState(REGIONS[0])

  const dropdownRef = useRef(null)
  const searchRef   = useRef(null)
  const regionRef   = useRef(null)
  const inputRef    = useRef(null)

  /* scroll → blur navbar */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  /* close panels on outside click */
  useEffect(() => {
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false)
      if (searchRef.current   && !searchRef.current.contains(e.target))   { setSearchOpen(false) }
      if (regionRef.current   && !regionRef.current.contains(e.target))   setRegionOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* focus input when search opens */
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
    else setSearchQuery('')
  }, [searchOpen])

  /* close mobile menu on route change */
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const handleRegionSelect = (r) => {
    setRegion(r)
    setRegionOpen(false)
  }

  return (
    <header className={`navbar-container${scrolled ? ' scrolled' : ''}`}>

      {/* ── Logo ── */}
      <Link to='/' className='nav-logo'>
        <img src='/logo.png' alt='Lunexa' />
      </Link>

      {/* ── Desktop nav links ── */}
      <nav className='nav-menu'>
        <ul className='nav-links'>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-link${isActive(item.to) ? ' active' : ''}`}
              >
                <span className='nav-link-icon'>{item.icon}</span>
                <span>{item.label}</span>
                <span className='nav-link-bar' />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Right side ── */}
      <div className='nav-right'>

        {/* Region picker */}
        <div ref={regionRef} className={`region-wrap${regionOpen ? ' open' : ''}`}>
          <button
            className='region-btn'
            onClick={() => setRegionOpen((v) => !v)}
            aria-label='Chọn khu vực'
          >
            <FaMapMarkerAlt className='region-pin' />
            <span className='region-label'>{region.label}</span>
            <FaChevronDown className={`region-caret${regionOpen ? ' up' : ''}`} />
          </button>

          <ul className='region-dropdown'>
            <li className='region-dropdown-title'>Chọn khu vực</li>
            {REGIONS.map((r) => (
              <li key={r.value}>
                <button
                  className={`region-option${region.value === r.value ? ' active' : ''}`}
                  onClick={() => handleRegionSelect(r)}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false) }}
          />
          <button
            className='search-toggle'
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? 'Đóng tìm kiếm' : 'Mở tìm kiếm'}
          >
            {searchOpen ? <FaTimes /> : <FaSearch />}
          </button>

          {/* Search results dropdown */}
          {searchOpen && searchQuery.length > 0 && (
            <div className='search-results'>
              <div className='search-results-hint'>
                <FaSearch />
                <span>Kết quả cho "<strong>{searchQuery}</strong>"</span>
              </div>
              <Link to={`/Films/Film?q=${searchQuery}`} className='search-result-item' onClick={() => setSearchOpen(false)}>
                <FaFilm />
                <span>Tìm phim: <strong>{searchQuery}</strong></span>
              </Link>
              <Link to={`/cinemas?q=${searchQuery}`} className='search-result-item' onClick={() => setSearchOpen(false)}>
                <FaMapMarkerAlt />
                <span>Tìm rạp: <strong>{searchQuery}</strong></span>
              </Link>
            </div>
          )}
        </div>

        {/* Notification */}
        <Link to='/notifications' className='nav-icon-btn notif-btn' aria-label='Thông báo'>
          <FaBell />
          <span className='notif-dot' />
        </Link>

        {/* Account dropdown */}
        <div
          ref={dropdownRef}
          className={`nav-dropdown${dropdownOpen ? ' open' : ''}`}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <button
            type='button'
            className='account-btn'
            onClick={(e) => { e.stopPropagation(); setDropdownOpen((v) => !v) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDropdownOpen((v) => !v) }
              if (e.key === 'Escape') setDropdownOpen(false)
            }}
            aria-expanded={dropdownOpen}
            aria-haspopup='menu'
          >
            <span className='account-avatar'>
              {profile ? profile.name?.[0]?.toUpperCase() : <FaUser />}
            </span>
            <span className='account-label'>
              {profile ? profile.name : 'Tài khoản'}
            </span>
            <span className={`account-caret${dropdownOpen ? ' up' : ''}`}>▾</span>
          </button>

          <ul className='nav-submenu' role='menu'>
            <div className='nav-submenu-inner'>
            {!profile ? (
              <>
                <li role='menuitem'>
                  <Link to='/Logins/Login' className='submenu-link'>
                    <span>🔑</span> Đăng nhập
                  </Link>
                </li>
                <li role='menuitem'>
                  <Link to='/Registers/Register' className='submenu-link'>
                    <span>✨</span> Đăng ký
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li className='submenu-user-info'>
                  <span className='submenu-avatar'>{profile.name?.[0]?.toUpperCase()}</span>
                  <div>
                    <div className='submenu-name'>{profile.name}</div>
                    <div className='submenu-email'>{profile.email || 'Thành viên'}</div>
                  </div>
                </li>
                <li className='submenu-divider' />
                <li role='menuitem'>
                  <Link to='/profile' className='submenu-link'>
                    <span>👤</span> Hồ sơ của tôi
                  </Link>
                </li>
                <li role='menuitem'>
                  <Link to='/Membership' className='submenu-link'>
                    <span>👑</span> Thành viên
                  </Link>
                </li>
                {profile?.role === 'admin' && (
                  <li role='menuitem'>
                    <Link to='/admin' className='submenu-link'>
                      <span>⚙️</span> Quản trị
                    </Link>
                  </li>
                )}
                <li className='submenu-divider' />
                <li role='menuitem'>
                  <Link to='/Logout' className='submenu-link logout'>
                    <span>🚪</span> Đăng xuất
                  </Link>
                </li>
              </>
            )}
            </div>
          </ul>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`hamburger${mobileOpen ? ' open' : ''}`}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label='Menu'
        >
          <span /><span /><span />
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      <div className={`mobile-drawer${mobileOpen ? ' open' : ''}`}>
        {/* Mobile search */}
        <div className='mobile-search'>
          <FaSearch className='mobile-search-icon' />
          <input type='text' placeholder='Tìm phim, rạp...' className='mobile-search-input' />
        </div>

        {/* Mobile region */}
        <div className='mobile-region'>
          <FaMapMarkerAlt />
          <span>Khu vực:</span>
          <select
            className='mobile-region-select'
            value={region.value}
            onChange={(e) => setRegion(REGIONS.find(r => r.value === e.target.value))}
          >
            {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <ul className='mobile-links'>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`mobile-link${isActive(item.to) ? ' active' : ''}`}
              >
                <span className='mobile-link-icon'>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className='mobile-auth'>
          {!profile ? (
            <>
              <Link to='/Logins/Login'       className='mobile-auth-btn primary'>Đăng nhập</Link>
              <Link to='/Registers/Register' className='mobile-auth-btn secondary'>Đăng ký</Link>
            </>
          ) : (
            <>
              <Link to='/profile' className='mobile-auth-btn primary'>Hồ sơ</Link>
              <Link to='/Logout'  className='mobile-auth-btn secondary'>Đăng xuất</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className='mobile-overlay' onClick={() => setMobileOpen(false)} />}

    </header>
  )
}
