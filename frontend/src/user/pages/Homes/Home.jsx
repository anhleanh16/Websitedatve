import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FaPlay, FaTicketAlt, FaStar, FaMapMarkerAlt, FaClock,
  FaFire, FaRobot, FaChevronLeft, FaChevronRight, FaTag, FaGift, FaBolt
} from 'react-icons/fa'
import { MdLocalOffer } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { userNewsService, userMovieService, userCinemaService, userPromotionService, userComboService, userShowtimeService } from '../../services/userApi'
import { toAbsoluteAssetUrl } from '../../../utils/api'
import './home.css'

/* ─── Helpers ─── */
const clamp = (r) => Math.min(r, 5)
const VISIBLE = 4
const FORMAT_COLORS = { '2D': '#3b82f6', '3D': '#8b5cf6', IMAX: '#f59e0b' }
const HERO_THEMES = [
  { accent: '#818cf8', bg: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#0f172a 100%)' },
  { accent: '#fca5a5', bg: 'linear-gradient(135deg,#450a0a 0%,#7f1d1d 40%,#0f172a 100%)' },
  { accent: '#86efac', bg: 'linear-gradient(135deg,#052e16 0%,#14532d 40%,#0f172a 100%)' },
]

function StarRating({ rating }) {
  const full  = Math.floor(clamp(rating))
  const empty = 5 - full
  return (
    <span className='star-rating'>
      {Array(full).fill(0).map((_, i)  => <FaStar key={`f${i}`} className='star full' />)}
      {Array(empty).fill(0).map((_, i) => <FaStar key={`e${i}`} className='star empty' />)}
    </span>
  )
}

const DEALS = [
  { id: 1, emoji: '🍿', title: 'Combo ưu đãi',    desc: 'Vé + bắp rang + nước chỉ 99K', tag: 'TIẾT KIỆM', color: '#0ea5e9' },
  { id: 2, emoji: '💑', title: 'Ưu đãi ghế đôi',  desc: 'Giảm 30% khi đặt 2 ghế đôi',  tag: 'HOT',       color: '#ec4899' },
  { id: 3, emoji: '📅', title: 'Ưu đãi thứ 3',    desc: 'Mua 2 tặng 1 mọi vé 2D',       tag: 'THỨ 3',     color: '#f59e0b' },
  { id: 4, emoji: '⭐', title: 'Ưu đãi thứ 5',    desc: 'Giảm 20% vé IMAX & 3D',        tag: 'THỨ 5',     color: '#7c3aed' },
]

const AD_SLIDES = [
  { id: 1, icon: <FaBolt />, tag: 'ĐANG CHẠY',  title: 'Mua 2 tặng 1 mỗi thứ 3',              desc: 'Áp dụng cho tất cả phim 2D đang chiếu. Không giới hạn số lần.',  color: '#f59e0b' },
  { id: 2, icon: <FaGift />, tag: 'QUÀ TẶNG',   title: 'Voucher 100K cho thành viên mới',       desc: 'Đăng ký tài khoản & đặt vé lần đầu nhận ngay voucher 100.000đ.', color: '#22c55e' },
  { id: 3, icon: <FaTag />,  tag: 'SẮP RA MẮT', title: 'Avengers: Secret Wars – Mở bán trước', desc: 'Đặt vé trước 7 ngày, nhận poster độc quyền kèm vé.',              color: '#818cf8' },
]

const HOME_NEWS_GROUPS = [
  { key: 'movie_news', label: 'Tin điện ảnh', color: '#7c3aed', icon: '🎬' },
  { key: 'promotion', label: 'Khuyến mãi', color: '#f59e0b', icon: '🎁' },
  { key: 'event', label: 'Sự kiện', color: '#22c55e', icon: '🎉' },
]

const formatReviewCount = (count) => {
  const value = Number(count || 0)
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  }
  return `${value}`
}

const formatMovieAge = (ageLimit) => {
  const age = Number(ageLimit || 0)
  return age > 0 ? `${age}+` : 'P'
}

const formatHomeDate = () =>
  new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

const formatRelativeTime = (value) => {
  if (!value) return 'Mới cập nhật'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Mới cập nhật'

  const diff = Date.now() - date.getTime()
  const hour = 60 * 60 * 1000
  const day = 24 * hour

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / (60 * 1000)))
    return `${minutes} phút trước`
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))} giờ trước`
  }

  if (diff < day * 7) {
    return `${Math.max(1, Math.floor(diff / day))} ngày trước`
  }

  return date.toLocaleDateString('vi-VN')
}

const getNewsTag = (category) => {
  switch (category) {
    case 'movie_news':
      return 'Điện ảnh'
    case 'promotion':
      return 'Ưu đãi'
    case 'event':
      return 'Sự kiện'
    case 'coming_soon':
      return 'Sắp chiếu'
    case 'review':
      return 'Review'
    case 'announcement':
      return 'Thông báo'
    default:
      return 'Tin tức'
  }
}

const getNewsFallbackIcon = (category) => {
  switch (category) {
    case 'movie_news':
      return '🎬'
    case 'promotion':
      return '🎁'
    case 'event':
      return '🎉'
    case 'coming_soon':
      return '🍿'
    case 'review':
      return '⭐'
    case 'announcement':
      return '📢'
    default:
      return '📰'
  }
}

const normalizeHomeNews = (item) => ({
  id: item.news_id,
  slug: item.slug,
  category: item.category,
  tag: getNewsTag(item.category),
  title: item.title,
  time: formatRelativeTime(item.published_at || item.created_at),
  image: item.thumbnail ? toAbsoluteAssetUrl(item.thumbnail) : '',
  icon: getNewsFallbackIcon(item.category),
  excerpt: item.short_description || '',
})

const buildHeroBackground = (poster, fallbackBg) =>
  poster
    ? `linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.76) 36%, rgba(15,23,42,0.9) 100%), url(${poster}) center/cover no-repeat`
    : fallbackBg

const normalizeMovie = (movie) => ({
  id: movie.movie_id,
  title: movie.title,
  poster: movie.poster || '',
  status: movie.status,
  releaseDate: movie.release_date,
  duration: Number(movie.duration || 0),
  age: formatMovieAge(movie.age_limit),
  rating: Number(movie.rating || 0),
  reviewCount: Number(movie.review_count || 0),
  genre: Array.isArray(movie.categories)
    ? movie.categories.map(c => c.category_name || c).filter(Boolean).join(', ') || 'Đang cập nhật'
    : (typeof movie.categories === 'string' && movie.categories.trim())
      ? movie.categories
      : 'Đang cập nhật',
  hot: Number(movie.rating || 0) >= 4.5 || Number(movie.review_count || 0) >= 10,
})

const buildHeroSlides = (movies) => {
  if (!movies.length) {
    return [
      {
        id: 'fallback',
        label: 'TRANG CHỦ',
        title: 'Khám phá phim mới tại Lunexa',
        desc: 'Danh sách phim, suất chiếu và rạp sẽ được đồng bộ trực tiếp từ cơ sở dữ liệu.',
        genre: 'Đang cập nhật',
        duration: '--',
        rating: 0,
        poster: '',
        accent: HERO_THEMES[0].accent,
        bg: HERO_THEMES[0].bg,
      },
    ]
  }

  return movies.slice(0, 3).map((movie, index) => {
    const theme = HERO_THEMES[index % HERO_THEMES.length]
    return {
      id: movie.id,
      label: movie.status === 'coming_soon' ? 'PHIM SẮP CHIẾU' : 'PHIM ĐANG CHIẾU',
      title: movie.title,
      desc:
        movie.genre && movie.genre !== 'Đang cập nhật'
          ? `Thể loại: ${movie.genre}. Đặt vé và xem lịch chiếu mới nhất được đồng bộ từ hệ thống.`
          : 'Đặt vé và xem lịch chiếu mới nhất được đồng bộ từ hệ thống.',
      genre: movie.genre,
      duration: movie.duration > 0 ? `${movie.duration} phút` : '--',
      rating: movie.rating,
      poster: movie.poster,
      accent: theme.accent,
      bg: buildHeroBackground(movie.poster, theme.bg),
    }
  })
}

const groupShowtimesByMovie = (items) => {
  const grouped = new Map()

  items.forEach((item) => {
    const key = `${item.movie_id}-${item.room_type}`
    const timeLabel = new Date(item.start_time).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (!grouped.has(key)) {
      grouped.set(key, {
        id: key,
        movieId: item.movie_id,
        title: item.movie_title,
        format: item.room_type || '2D',
        roomId: item.room_id,
        roomName: item.room_name,
        times: [],
      })
    }

    grouped.get(key).times.push({
      label: timeLabel,
      showtimeId: item.showtime_id,
      roomId: item.room_id,
      roomName: item.room_name,
      format: item.room_type || '2D',
    })
  })

  return Array.from(grouped.values()).slice(0, 6)
}

export default function Home() {
  const selectedCinema = useSelector((s) => s.cinema.selectedCinema)
  const navigate = useNavigate()

  const [slide,       setSlide]       = useState(0)
  const [sliding,     setSliding]     = useState(false)
  const [movieTab,    setMovieTab]    = useState('now')
  const [showtimeTab, setShowtimeTab] = useState('all')
  const [movieOff,    setMovieOff]    = useState(0)
  const [adSlide,     setAdSlide]     = useState(0)
  const [nowShowing,  setNowShowing]  = useState([])
  const [comingSoon,  setComingSoon]  = useState([])
  const [cinemas,     setCinemas]     = useState([])
  const [selectedCinemaId, setSelectedCinemaId] = useState('')
  const [showtimes,   setShowtimes]   = useState([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [loadingShowtimes, setLoadingShowtimes] = useState(false)
  const [homeNews, setHomeNews] = useState([])
  const [moviesError, setMoviesError] = useState('')
  const [showtimesError, setShowtimesError] = useState('')
  const [newsError, setNewsError] = useState('')

  const heroTimer = useRef(null)
  const adTimer   = useRef(null)

  useEffect(() => {
    const loadHomeData = async () => {
      setLoadingMovies(true)
      setMoviesError('')

      try {
        const [nowData, soonData, cinemaData] = await Promise.all([
          userMovieService.getAll({ status: 'now_showing' }),
          userMovieService.getAll({ status: 'coming_soon' }),
          userCinemaService.getAll(),
        ])

        const nextNowShowing = Array.isArray(nowData?.movies)
          ? nowData.movies.map(normalizeMovie)
          : []
        const nextComingSoon = Array.isArray(soonData?.movies)
          ? soonData.movies.map(normalizeMovie)
          : []
        const nextCinemas = Array.isArray(cinemaData?.cinemas)
          ? cinemaData.cinemas
          : []

        setNowShowing(nextNowShowing)
        setComingSoon(nextComingSoon)
        setCinemas(nextCinemas)
        setSelectedCinemaId((prev) => {
          // Ưu tiên rạp đã chọn từ header
          if (selectedCinema?.id) return String(selectedCinema.id)
          return prev || String(nextCinemas[0]?.cinemas_id || '')
        })
      } catch (err) {
        console.error(err)
        setNowShowing([])
        setComingSoon([])
        setCinemas([])
        setMoviesError('Không thể tải dữ liệu phim từ database.')
      } finally {
        setLoadingMovies(false)
      }
    }

    loadHomeData()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadHomeNews = async () => {
      setNewsError('')

      try {
        const data = await userNewsService.getAll({ limit: 12 })
        const nextNews = Array.isArray(data?.news)
          ? data.news.map(normalizeHomeNews)
          : []
        setHomeNews(nextNews)
      } catch (err) {
        if (err?.name === 'AbortError') return
        console.error(err)
        setHomeNews([])
        setNewsError('Không thể tải tin tức từ database.')
      }
    }

    loadHomeNews()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedCinemaId) {
      setShowtimes([])
      return
    }

    const loadShowtimes = async () => {
      setLoadingShowtimes(true)
      setShowtimesError('')

      try {
        const params = { cinemaId: selectedCinemaId }
        if (showtimeTab !== 'all') params.format = showtimeTab

        const data = await userShowtimeService.getAll(params)
        setShowtimes(Array.isArray(data?.showtimes) ? data.showtimes : [])
      } catch (err) {
        console.error(err)
        setShowtimes([])
        setShowtimesError('Không thể tải lịch chiếu từ database.')
      } finally {
        setLoadingShowtimes(false)
      }
    }

    loadShowtimes()
  }, [selectedCinemaId, showtimeTab])

  const featuredMovies = movieTab === 'soon' ? comingSoon : nowShowing
  const heroSlides = useMemo(
    () => buildHeroSlides([...nowShowing, ...comingSoon]),
    [nowShowing, comingSoon],
  )
  const maxOff = Math.max(featuredMovies.length - VISIBLE, 0)
  const visibleMovies = featuredMovies.slice(movieOff, movieOff + VISIBLE)
  const current = heroSlides[slide] || heroSlides[0]
  const adCurrent = AD_SLIDES[adSlide]
  const selectedCinemaObj = cinemas.find(
    (cinema) => `${cinema.cinemas_id}` === `${selectedCinemaId}`,
  )
  const groupedShowtimes = useMemo(
    () => groupShowtimesByMovie(showtimes),
    [showtimes],
  )
  const groupedHomeNews = useMemo(
    () =>
      HOME_NEWS_GROUPS.map((group) => ({
        ...group,
        items: homeNews.filter((item) => item.category === group.key).slice(0, 3),
      })),
    [homeNews],
  )

  useEffect(() => {
    setMovieOff((prev) => Math.min(prev, maxOff))
  }, [maxOff, movieTab])

  // Đồng bộ rạp được chọn từ header navbar
  useEffect(() => {
    if (selectedCinema?.id) {
      setSelectedCinemaId(String(selectedCinema.id))
    }
  }, [selectedCinema])

  /* Hero auto-slide */
  const startHero = () => {
    if (heroSlides.length <= 1) return
    heroTimer.current = setInterval(() => changeHero(p => (p + 1) % heroSlides.length), 5000)
  }
  useEffect(() => {
    clearInterval(heroTimer.current)
    startHero()
    return () => clearInterval(heroTimer.current)
  }, [heroSlides.length])

  useEffect(() => {
    setSlide((prev) => (prev >= heroSlides.length ? 0 : prev))
  }, [heroSlides.length])

  const changeHero = (fn) => {
    setSliding(true)
    setTimeout(() => { setSlide(fn); setSliding(false) }, 320)
  }

  /* Ad banner auto-slide */
  useEffect(() => {
    adTimer.current = setInterval(() => setAdSlide(p => (p + 1) % AD_SLIDES.length), 4000)
    return () => clearInterval(adTimer.current)
  }, [])

  /* Movie carousel */
  const goMovies = (dir) => setMovieOff(p => Math.min(Math.max(p + dir, 0), maxOff))

  return (
    <div className='home-page'>

      {/* AI Float */}
      <Link to='/ai-assistant' className='ai-float-btn'>
        <span className='ai-float-icon'><FaRobot /></span>
        <span className='ai-float-label'>AI Assistant</span>
      </Link>

      {/* ══════════════════════════════════════════
          LAYOUT CHÍNH: 2 CỘT
      ══════════════════════════════════════════ */}
      <div className='main-layout'>

        {/* ── CỘT TRÁI ── */}
        <div className='col-left'>

          {/* Hero Slider */}
          <div className='hero-slider' style={{ background: current.bg }}>
            <div className='hero-blob blob-1' style={{ background: current.accent + '33' }} />
            <div className='hero-blob blob-2' style={{ background: current.accent + '22' }} />

            <div className={`hero-slide-content${sliding ? ' sliding' : ''}`}>
              <span className='hero-chip' style={{ borderColor: current.accent + '88', color: current.accent }}>
                {current.label}
              </span>
              <h1 className='hero-title'>{current.title}</h1>
              <p className='hero-desc'>{current.desc}</p>
              <div className='hero-meta'>
                <span className='hero-meta-item'>
                  {current.rating > 0 ? <StarRating rating={current.rating} /> : <FaStar style={{ color: '#64748b' }} />}
                  <span style={{ color: '#fbbf24', fontWeight: 700, marginLeft: 4 }}>
                    {current.rating > 0 ? `${current.rating}/5` : 'Chưa có đánh giá'}
                  </span>
                </span>
                <span className='hero-meta-sep'>·</span>
                <span className='hero-meta-item'>{current.genre}</span>
                <span className='hero-meta-sep'>·</span>
                <span className='hero-meta-item'><FaClock /> {current.duration}</span>
              </div>
              <div className='hero-actions'>
                <Link to={`/movie/${current.id}`} className='hero-btn-primary'
                  style={{ background: current.accent, color: '#0f172a' }}>
                  <FaPlay /> Xem ngay
                </Link>
                <button
                  className='hero-btn-secondary'
                  onClick={() => {
                    if (!current.id || current.id === 'fallback') return
                    navigate(`/movie/${current.id}`, { state: { scrollToSchedule: true } })
                  }}
                >
                  <FaTicketAlt /> Mua vé
                </button>
              </div>
            </div>

            <div className='hero-dots'>
              {heroSlides.map((_, i) => (
                <button key={i}
                  className={`hero-dot${i === slide ? ' active' : ''}`}
                  style={i === slide ? { background: current.accent } : {}}
                  onClick={() => { clearInterval(heroTimer.current); changeHero(i); startHero() }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <div className='hero-counter'>{slide + 1} / {heroSlides.length}</div>
          </div>

          {/* Phim nổi bật */}
          <div className='movies-block'>
            <div className='sec-header'>
              <div className='sec-title-group'>
                <h2>Phim đang hot</h2>
              </div>
              <div className='sec-tabs'>
                <button className={`sec-tab${movieTab === 'now' ? ' active' : ''}`}
                  onClick={() => { setMovieTab('now'); setMovieOff(0) }}>Đang chiếu</button>
                <button className={`sec-tab${movieTab === 'soon' ? ' active' : ''}`}
                  onClick={() => { setMovieTab('soon'); setMovieOff(0) }}>Sắp chiếu</button>
              </div>
              <div className='movie-nav'>
                <button className='movie-nav-btn' onClick={() => goMovies(-1)} disabled={movieOff === 0} aria-label='Trước'>
                  <FaChevronLeft />
                </button>
                <button className='movie-nav-btn' onClick={() => goMovies(1)} disabled={movieOff >= maxOff} aria-label='Sau'>
                  <FaChevronRight />
                </button>
              </div>
              <Link to='/Films/Film' className='sec-link'>Xem thêm →</Link>
            </div>

            <div className='movies-grid'>
              {loadingMovies && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Đang tải phim từ database...
                </div>
              )}
              {!loadingMovies && moviesError && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  {moviesError}
                </div>
              )}
              {!loadingMovies && !moviesError && visibleMovies.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Chưa có phim để hiển thị.
                </div>
              )}
              {visibleMovies.map(m => (
                <Link to={`/movie/${m.id}`} className='movie-card' key={m.id}>
                  {m.hot && <span className='movie-hot'><FaFire /> HOT</span>}
                  <div
                    className='movie-poster'
                    style={m.poster ? { backgroundImage: `url(${m.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {!m.poster && <div className='movie-poster-placeholder'><FaPlay className='poster-play' /></div>}
                    <span className='movie-age'>{m.age}</span>
                  </div>
                  <div className='movie-info'>
                    <div className='movie-title'>{m.title}</div>
                    <div className='movie-genre'>{m.genre}</div>
                    <div className='movie-footer'>
                      <div className='movie-rating-wrap'>
                        {m.rating > 0 ? <StarRating rating={m.rating} /> : <FaStar style={{ color: '#475569', fontSize: '0.7rem' }} />}
                        <span className='movie-rating-num'>{m.rating > 0 ? m.rating : '--'}</span>
                        <span className='movie-votes'>({formatReviewCount(m.reviewCount)})</span>
                      </div>
                      <button className='movie-ticket-btn' onClick={e => e.preventDefault()}>
                        <FaTicketAlt />
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Carousel dots */}
            {maxOff > 0 && (
              <div className='movie-carousel-dots'>
                {Array(maxOff + 1).fill(0).map((_, i) => (
                  <button key={i} className={`mcd${movieOff === i ? ' active' : ''}`}
                    onClick={() => setMovieOff(i)} aria-label={`Trang ${i + 1}`} />
                ))}
              </div>
            )}
          </div>

          {/* Suất chiếu hôm nay */}
          <div className='showtime-card'>
            <div className='showtime-top'>
              <div>
                <h3><FaMapMarkerAlt style={{ color: '#7c3aed' }} /> {selectedCinemaObj?.cinema_name || 'Đang chọn rạp'}</h3>
                <p className='showtime-date'>Hôm nay, {formatHomeDate()}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  value={selectedCinemaId}
                  onChange={(e) => setSelectedCinemaId(e.target.value)}
                  style={{
                    minWidth: 220,
                    padding: '0.42rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid rgba(148,163,184,0.2)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#e2e8f0',
                  }}
                >
                  {cinemas.map((cinema) => (
                    <option key={cinema.cinemas_id} value={cinema.cinemas_id} style={{ color: '#0f172a' }}>
                      {cinema.cinema_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='showtime-format-tabs'>
                {['all', '2D', '3D', 'IMAX'].map(f => (
                  <button key={f}
                    className={`fmt-tab${showtimeTab === f ? ' active' : ''}`}
                    style={showtimeTab === f && f !== 'all' ? { background: FORMAT_COLORS[f], borderColor: FORMAT_COLORS[f] } : {}}
                    onClick={() => setShowtimeTab(f)}>
                    {f === 'all' ? 'Tất cả' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className='showtime-grid-blocks'>
              {loadingShowtimes && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Đang tải lịch chiếu từ database...
                </div>
              )}
              {!loadingShowtimes && showtimesError && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  {showtimesError}
                </div>
              )}
              {!loadingShowtimes && !showtimesError && groupedShowtimes.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Chưa có lịch chiếu cho rạp hoặc định dạng đã chọn.
                </div>
              )}
              {groupedShowtimes.map(row => (
                <div key={row.id} className='showtime-block'>
                  <div className='sb-movie-header'>
                    <span className='sb-title'>{row.title}</span>
                    <span className='sb-format'
                      style={{
                        background: `${FORMAT_COLORS[row.format] || '#7c3aed'}22`,
                        color: FORMAT_COLORS[row.format] || '#7c3aed',
                      }}>
                      {row.format}
                    </span>
                  </div>
                  <div className='sb-times'>
                    {row.times.map(t => (
                      <Link
                        key={`${row.id}-${t.showtimeId}`}
                        to='/booking'
                        state={{
                          movieTitle: row.title,
                          cinema: selectedCinemaObj?.cinema_name || '',
                          cinemaId: selectedCinemaObj?.cinemas_id || null,
                          roomId: t.roomId,
                          roomName: t.roomName,
                          roomType: t.format,
                          day: 'Hôm nay',
                          time: t.label,
                          showtimeId: t.showtimeId,
                        }}
                        className='sb-time-btn'
                      >
                        {t.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Link to='/cinemas' className='showtime-more-link'>Xem tất cả rạp →</Link>
          </div>

          {/* Tin tức mới nhất */}
          <div className='news-block'>
            <div className='sec-header'>
              <div className='sec-title-group'>
                <h2>Tin tức mới nhất</h2>
                <p>Tổng hợp theo 3 chủ đề nổi bật từ hệ thống tin tức.</p>
              </div>
              <Link to='/News' className='sec-link'>Xem tất cả →</Link>
            </div>
            <div className='news-grid'>
              {newsError && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  {newsError}
                </div>
              )}
              {!newsError && homeNews.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Chưa có tin tức nổi bật để hiển thị.
                </div>
              )}
              {!newsError && groupedHomeNews.map(group => (
                <div key={group.key} className='news-group-card'>
                  <div className='news-group-head'>
                    <span
                      className='news-group-icon'
                      style={{ background: `${group.color}22`, color: group.color }}
                    >
                      {group.icon}
                    </span>
                    <div>
                      <h3 style={{ color: group.color }}>{group.label}</h3>
                      <p>{group.items.length > 0 ? `${group.items.length} bài mới nhất` : 'Chưa có bài viết'}</p>
                    </div>
                  </div>

                  <div className='news-group-list'>
                    {group.items.length === 0 ? (
                      <div className='news-group-empty'>Chưa có nội dung trong mục này.</div>
                    ) : (
                      <>
                        <Link to={`/news/${group.items[0].slug}`} className='news-feature-card'>
                          <div
                            className='news-feature-image'
                            style={group.items[0].image ? { backgroundImage: `url(${group.items[0].image})` } : undefined}
                          >
                            {!group.items[0].image && <span>{group.items[0].icon}</span>}
                          </div>
                          <div className='news-feature-body'>
                            <span className='news-tag'>{group.items[0].tag}</span>
                            <h4 className='news-feature-title'>{group.items[0].title}</h4>
                            {group.items[0].excerpt && <p className='news-feature-excerpt'>{group.items[0].excerpt}</p>}
                            <span className='news-time'><FaClock /> {group.items[0].time}</span>
                          </div>
                        </Link>

                        {group.items.slice(1, 3).map(n => (
                          <Link to={`/news/${n.slug}`} key={n.id} className='news-card news-card-compact'>
                            <div
                              className='news-img'
                              style={n.image ? { backgroundImage: `url(${n.image})` } : undefined}
                            >
                              {!n.image && n.icon}
                            </div>
                            <div className='news-body'>
                              <span className='news-tag'>{n.tag}</span>
                              <p className='news-title'>{n.title}</p>
                              <span className='news-time'><FaClock /> {n.time}</span>
                            </div>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>{/* end col-left */}

        {/* ── CỘT PHẢI ── */}
        <aside className='col-right'>

          {/* Đặt vé nhanh */}
          <div className='quick-book'>
            <div className='quick-book-header'>
              <h4>Đặt vé nhanh</h4>
              <span>Dành cho người mới, làm lần lượt theo 4 bước này.</span>
            </div>
            <div className='quick-book-steps'>
              {[
                { step: 'Bước 1', title: 'Chọn phim',      description: 'Tìm bộ phim bạn muốn xem trong danh sách phim đang chiếu.' },
                { step: 'Bước 2', title: 'Chọn rạp',       description: 'Chọn rạp gần bạn nhất hoặc phù hợp nhất.' },
                { step: 'Bước 3', title: 'Chọn ngày',      description: 'Xem lịch chiếu và chọn ngày bạn muốn đến rạp.' },
                { step: 'Bước 4', title: 'Chọn suất chiếu','description': 'Chọn giờ đẹp rồi vào thẳng phần đặt ghế.' },
              ].map((item, index) => (
                <div
                  key={item.step}
                  className='quick-book-step'
                  style={{ animationDelay: `${index * 0.24}s` }}
                >
                  <div className='quick-book-step-index'>{index + 1}</div>
                  <div className='quick-book-step-content'>
                    <span className='quick-book-step-badge'>{item.step}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ưu đãi hôm nay */}
          <div className='deals-card'>
            <div className='deals-header'>
              <MdLocalOffer className='deals-icon' />
              <h3>Ưu đãi hôm nay</h3>
            </div>
            <div className='deals-list'>
              {DEALS.map(d => (
                <div key={d.id} className='deal-item'>
                  <span className='deal-emoji'>{d.emoji}</span>
                  <div className='deal-body'>
                    <div className='deal-title-row'>
                      <span className='deal-title'>{d.title}</span>
                      <span className='deal-tag' style={{ background: d.color + '22', color: d.color }}>{d.tag}</span>
                    </div>
                    <span className='deal-desc'>{d.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <Link to='/Membership' className='deals-more-btn'>
              <span>👑</span> Xem ưu đãi thành viên
            </Link>
          </div>

          {/* Banner quảng cáo nhỏ tự động slide */}
          <div className='ad-mini-banner' style={{ borderColor: adCurrent.color + '44', background: adCurrent.color + '0d' }}>
            <div className='ad-mini-icon' style={{ color: adCurrent.color, background: adCurrent.color + '22' }}>
              {adCurrent.icon}
            </div>
            <div className='ad-mini-body'>
              <span className='ad-mini-tag' style={{ background: adCurrent.color + '22', color: adCurrent.color }}>
                {adCurrent.tag}
              </span>
              <div className='ad-mini-title'>{adCurrent.title}</div>
              <div className='ad-mini-desc'>{adCurrent.desc}</div>
            </div>
            {/* dots */}
            <div className='ad-mini-dots'>
              {AD_SLIDES.map((_, i) => (
                <button key={i}
                  className={`ad-dot${adSlide === i ? ' active' : ''}`}
                  style={adSlide === i ? { background: adCurrent.color } : {}}
                  onClick={() => { clearInterval(adTimer.current); setAdSlide(i) }}
                  aria-label={`Banner ${i + 1}`}
                />
              ))}
            </div>
          </div>

        </aside>
      </div>{/* end main-layout */}
    </div>
  )
}
