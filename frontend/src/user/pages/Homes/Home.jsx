import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  FaPlay, FaTicketAlt, FaStar, FaMapMarkerAlt, FaClock,
  FaFire, FaRobot, FaChevronLeft, FaChevronRight, FaTag, FaGift, FaBolt, FaNewspaper
} from 'react-icons/fa'
import { MdLocalOffer } from 'react-icons/md'
import './home.css'

/* ─── Helpers ─── */
const clamp = (r) => Math.min(r, 5)

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

/* ─── Data ─── */
const SLIDES = [
  {
    id: 1, label: 'PHIM HOT THÁNG 6',
    title: 'Doraemon: Nobita và Cuộc Chiến Vũ Trụ Tí Hon',
    desc: 'Hành trình phiêu lưu kỳ diệu cùng Doraemon và những người bạn trong thế giới vũ trụ thu nhỏ đầy bất ngờ.',
    genre: 'Hoạt hình · Phiêu lưu', duration: '96 phút', rating: 4.1,
    bg: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#0f172a 100%)', accent: '#818cf8',
  },
  {
    id: 2, label: 'PHIM SẮP CHIẾU',
    title: 'Avengers: Secret Wars',
    desc: 'Cuộc chiến vũ trụ quy mô lớn nhất từ trước đến nay. Số phận đa vũ trụ được quyết định bởi những anh hùng cuối cùng.',
    genre: 'Hành động · Siêu anh hùng', duration: '180 phút', rating: 4.6,
    bg: 'linear-gradient(135deg,#450a0a 0%,#7f1d1d 40%,#0f172a 100%)', accent: '#fca5a5',
  },
  {
    id: 3, label: 'ĐANG CHIẾU',
    title: 'Inside Out 3: Cảm Xúc Bùng Nổ',
    desc: 'Riley trưởng thành hơn, thế giới cảm xúc bên trong cũng phức tạp hơn bao giờ hết với những cảm xúc hoàn toàn mới.',
    genre: 'Hoạt hình · Gia đình', duration: '100 phút', rating: 4.4,
    bg: 'linear-gradient(135deg,#052e16 0%,#14532d 40%,#0f172a 100%)', accent: '#86efac',
  },
]

const NOW_SHOWING = [
  { id: 1, title: 'Doraemon',     genre: 'Hoạt hình',           rating: 4.1, votes: '2.1k', age: 'P',   hot: true  },
  { id: 2, title: 'Avengers',     genre: 'Hành động',           rating: 4.6, votes: '5.4k', age: '13+', hot: true  },
  { id: 3, title: 'Inside Out 3', genre: 'Gia đình',            rating: 4.4, votes: '3.2k', age: 'P',   hot: false },
  { id: 4, title: 'Dune: Part 3', genre: 'Khoa học viễn tưởng', rating: 4.3, votes: '1.8k', age: '13+', hot: false },
  { id: 5, title: 'Moana 3',      genre: 'Hoạt hình',           rating: 4.0, votes: '1.1k', age: 'P',   hot: false },
  { id: 6, title: 'Spider-Man 4', genre: 'Hành động',           rating: 4.5, votes: '4.7k', age: '13+', hot: true  },
]

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

const SHOWTIMES = {
  all:  [
    { id: 1, title: 'Doraemon',     times: ['09:00','11:30','14:00','16:30'], format: '2D'   },
    { id: 2, title: 'Avengers',     times: ['10:00','13:15','16:45','20:00'], format: 'IMAX' },
    { id: 3, title: 'Inside Out 3', times: ['09:30','12:00','15:30','18:00'], format: '3D'   },
    { id: 4, title: 'Spider-Man 4', times: ['11:00','14:30','17:00','20:30'], format: 'IMAX' },
  ],
  '2D':  [{ id: 1, title: 'Doraemon',     times: ['09:00','11:30','14:00','16:30'], format: '2D'   }],
  '3D':  [{ id: 3, title: 'Inside Out 3', times: ['09:30','12:00','15:30','18:00'], format: '3D'   }],
  IMAX:  [
    { id: 2, title: 'Avengers',     times: ['10:00','13:15','16:45','20:00'], format: 'IMAX' },
    { id: 4, title: 'Spider-Man 4', times: ['11:00','14:30','17:00','20:30'], format: 'IMAX' },
  ],
}

const NEWS = [
  { id: 1, tag: 'Điện ảnh', title: 'Avengers: Secret Wars xác nhận ngày khởi chiếu toàn cầu',         time: '2 giờ trước',  img: '🎬' },
  { id: 2, tag: 'Ưu đãi',   title: 'Lunexa Movix ra mắt thẻ thành viên Diamond với đặc quyền độc quyền', time: '5 giờ trước',  img: '🎁' },
  { id: 3, tag: 'Phim mới', title: 'Inside Out 3 phá kỷ lục phòng vé tuần đầu tại Việt Nam',           time: '1 ngày trước', img: '📊' },
  { id: 4, tag: 'Sự kiện', title: 'Đêm hội điện ảnh Lunexa 2026 – Sự kiện không thể bỏ lỡ tháng 7',  time: '2 ngày trước', img: '🎉' },
]

const BOOKING_STEPS  = ['Chọn phim', 'Chọn rạp', 'Chọn ngày', 'Suất chiếu']
const FORMAT_COLORS  = { '2D': '#3b82f6', '3D': '#8b5cf6', IMAX: '#f59e0b' }
const VISIBLE        = 4

export default function Home() {
  const [slide,       setSlide]       = useState(0)
  const [sliding,     setSliding]     = useState(false)
  const [movieTab,    setMovieTab]    = useState('now')
  const [showtimeTab, setShowtimeTab] = useState('all')
  const [bookingStep, setBookingStep] = useState(0)
  const [movieOff,    setMovieOff]    = useState(0)
  const [adSlide,     setAdSlide]     = useState(0)

  const heroTimer = useRef(null)
  const adTimer   = useRef(null)

  /* Hero auto-slide */
  const startHero = () => {
    heroTimer.current = setInterval(() => changeHero(p => (p + 1) % SLIDES.length), 5000)
  }
  useEffect(() => { startHero(); return () => clearInterval(heroTimer.current) }, [])

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
  const maxOff = NOW_SHOWING.length - VISIBLE
  const goMovies = (dir) => setMovieOff(p => Math.min(Math.max(p + dir, 0), maxOff))
  const visibleMovies = NOW_SHOWING.slice(movieOff, movieOff + VISIBLE)

  const current = SLIDES[slide]
  const adCurrent = AD_SLIDES[adSlide]

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
                  <StarRating rating={current.rating} />
                  <span style={{ color: '#fbbf24', fontWeight: 700, marginLeft: 4 }}>{current.rating}/5</span>
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
                <Link to='/Bookings/Booking' className='hero-btn-secondary'>
                  <FaTicketAlt /> Mua vé
                </Link>
              </div>
            </div>

            <div className='hero-dots'>
              {SLIDES.map((_, i) => (
                <button key={i}
                  className={`hero-dot${i === slide ? ' active' : ''}`}
                  style={i === slide ? { background: current.accent } : {}}
                  onClick={() => { clearInterval(heroTimer.current); changeHero(i); startHero() }}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <div className='hero-counter'>{slide + 1} / {SLIDES.length}</div>
          </div>

          {/* Phim nổi bật */}
          <div className='movies-block'>
            <div className='sec-header'>
              <div className='sec-title-group'>
                <h2>Phim nổi bật</h2>
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
              {visibleMovies.map(m => (
                <Link to={`/movie/${m.id}`} className='movie-card' key={m.id}>
                  {m.hot && <span className='movie-hot'><FaFire /> HOT</span>}
                  <div className='movie-poster'>
                    <div className='movie-poster-placeholder'><FaPlay className='poster-play' /></div>
                    <span className='movie-age'>{m.age}</span>
                  </div>
                  <div className='movie-info'>
                    <div className='movie-title'>{m.title}</div>
                    <div className='movie-genre'>{m.genre}</div>
                    <div className='movie-footer'>
                      <div className='movie-rating-wrap'>
                        <StarRating rating={m.rating} />
                        <span className='movie-rating-num'>{m.rating}</span>
                        <span className='movie-votes'>({m.votes})</span>
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
            <div className='movie-carousel-dots'>
              {Array(maxOff + 1).fill(0).map((_, i) => (
                <button key={i} className={`mcd${movieOff === i ? ' active' : ''}`}
                  onClick={() => setMovieOff(i)} aria-label={`Trang ${i + 1}`} />
              ))}
            </div>
          </div>

          {/* Suất chiếu hôm nay */}
          <div className='showtime-card'>
            <div className='showtime-top'>
              <div>
                <h3><FaMapMarkerAlt style={{ color: '#7c3aed' }} /> Lunexa – Đà Nẵng</h3>
                <p className='showtime-date'>Hôm nay, Thứ Hai 08/06/2026</p>
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
              {SHOWTIMES[showtimeTab].map(row => (
                <div key={row.id} className='showtime-block'>
                  <div className='sb-movie-header'>
                    <span className='sb-title'>{row.title}</span>
                    <span className='sb-format'
                      style={{ background: FORMAT_COLORS[row.format] + '22', color: FORMAT_COLORS[row.format] }}>
                      {row.format}
                    </span>
                  </div>
                  <div className='sb-times'>
                    {row.times.map(t => (
                      <Link key={t} to='/Bookings/Booking' className='sb-time-btn'>{t}</Link>
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
              </div>
              <Link to='/News' className='sec-link'>Xem tất cả →</Link>
            </div>
            <div className='news-grid'>
              {NEWS.map(n => (
                <Link to='/News' key={n.id} className='news-card'>
                  <div className='news-img'>{n.img}</div>
                  <div className='news-body'>
                    <span className='news-tag'>{n.tag}</span>
                    <p className='news-title'>{n.title}</p>
                    <span className='news-time'><FaClock /> {n.time}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>{/* end col-left */}

        {/* ── CỘT PHẢI ── */}
        <aside className='col-right'>

          {/* Đặt vé nhanh */}
          <div className='quick-book-card'>
            <div className='qb-header'>
              <FaTicketAlt className='qb-icon' />
              <div>
                <h2>Đặt vé nhanh</h2>
                <p>Chỉ vài bước để có vé xem phim</p>
              </div>
            </div>
            <div className='qb-steps'>
              {BOOKING_STEPS.map((s, i) => (
                <button key={i}
                  className={`qb-step${bookingStep === i ? ' active' : ''}${bookingStep > i ? ' done' : ''}`}
                  onClick={() => setBookingStep(i)}>
                  <span className='qb-step-num'>{bookingStep > i ? '✓' : i + 1}</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
            <Link to='/Bookings/Booking' className='qb-cta'>
              <FaTicketAlt /> Tiến hành đặt vé
            </Link>
            <div className='qb-promo-hint'>
              <MdLocalOffer /><span>Thành viên Gold giảm 20% hôm nay</span>
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
