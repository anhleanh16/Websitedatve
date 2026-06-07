import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FaPlay, FaTicketAlt, FaStar, FaMapMarkerAlt, FaClock, FaFire, FaRobot } from 'react-icons/fa'
import { MdLocalOffer } from 'react-icons/md'
import './home.css'

/* ─── Mock data ─── */
const SLIDES = [
  {
    id: 1,
    label: 'PHIM HOT THÁNG 6',
    title: 'Doraemon: Nobita và Cuộc Chiến Vũ Trụ Tí Hon',
    desc: 'Hành trình phiêu lưu kỳ diệu cùng Doraemon và những người bạn trong thế giới vũ trụ thu nhỏ đầy bất ngờ.',
    genre: 'Hoạt hình · Phiêu lưu',
    duration: '96 phút',
    rating: 8.2,
    bg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)',
    accent: '#818cf8',
  },
  {
    id: 2,
    label: 'PHIM SẮP CHIẾU',
    title: 'Avengers: Secret Wars',
    desc: 'Cuộc chiến vũ trụ quy mô lớn nhất từ trước đến nay. Số phận đa vũ trụ được quyết định bởi những anh hùng cuối cùng.',
    genre: 'Hành động · Siêu anh hùng',
    duration: '180 phút',
    rating: 9.1,
    bg: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 40%, #0f172a 100%)',
    accent: '#fca5a5',
  },
  {
    id: 3,
    label: 'ĐANG CHIẾU',
    title: 'Inside Out 3: Cảm Xúc Bùng Nổ',
    desc: 'Riley trưởng thành hơn, thế giới cảm xúc bên trong cũng phức tạp hơn bao giờ hết với những cảm xúc hoàn toàn mới.',
    genre: 'Hoạt hình · Gia đình',
    duration: '100 phút',
    rating: 8.7,
    bg: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #0f172a 100%)',
    accent: '#86efac',
  },
]

const NOW_SHOWING = [
  { id: 1, title: 'Doraemon', genre: 'Hoạt hình', rating: 8.2, votes: '2.1k', age: 'P', hot: true },
  { id: 2, title: 'Avengers', genre: 'Hành động', rating: 9.1, votes: '5.4k', age: '13+', hot: true },
  { id: 3, title: 'Inside Out 3', genre: 'Gia đình', rating: 8.7, votes: '3.2k', age: 'P', hot: false },
  { id: 4, title: 'Dune: Part 3', genre: 'Khoa học viễn tưởng', rating: 8.5, votes: '1.8k', age: '13+', hot: false },
  { id: 5, title: 'Moana 3', genre: 'Hoạt hình', rating: 8.0, votes: '1.1k', age: 'P', hot: false },
  { id: 6, title: 'Spider-Man 4', genre: 'Hành động', rating: 8.9, votes: '4.7k', age: '13+', hot: true },
]

const SHOWTIMES = {
  all: [
    { id: 1, title: 'Doraemon', times: ['09:00', '11:30', '14:00', '16:30'], format: '2D' },
    { id: 2, title: 'Avengers', times: ['10:00', '13:15', '16:45', '20:00'], format: 'IMAX' },
    { id: 3, title: 'Inside Out 3', times: ['09:30', '12:00', '15:30', '18:00'], format: '3D' },
    { id: 4, title: 'Spider-Man 4', times: ['11:00', '14:30', '17:00', '20:30'], format: 'IMAX' },
  ],
  '2D': [
    { id: 1, title: 'Doraemon', times: ['09:00', '11:30', '14:00', '16:30'], format: '2D' },
  ],
  '3D': [
    { id: 3, title: 'Inside Out 3', times: ['09:30', '12:00', '15:30', '18:00'], format: '3D' },
  ],
  IMAX: [
    { id: 2, title: 'Avengers', times: ['10:00', '13:15', '16:45', '20:00'], format: 'IMAX' },
    { id: 4, title: 'Spider-Man 4', times: ['11:00', '14:30', '17:00', '20:30'], format: 'IMAX' },
  ],
}

const PROMOS = [
  { id: 1, emoji: '🎟️', title: 'Mua 2 tặng 1', desc: 'Thứ 3 hàng tuần – chỉ áp dụng vé 2D', tag: 'HOT' },
  { id: 2, emoji: '🍿', title: 'Combo sinh viên', desc: 'Vé + bắp + nước chỉ 99K với thẻ SV', tag: 'MỚI' },
  { id: 3, emoji: '👑', title: 'Ưu đãi thành viên Gold', desc: 'Giảm 20% tất cả vé khi đủ 500 điểm', tag: 'VIP' },
]

const BOOKING_STEPS = ['Chọn phim', 'Chọn rạp', 'Chọn ngày', 'Suất chiếu']

const FORMAT_COLORS = { '2D': '#3b82f6', '3D': '#8b5cf6', IMAX: '#f59e0b' }

/* ─── Component ─── */
export default function Home() {
  const [slide, setSlide] = useState(0)
  const [sliding, setSliding] = useState(false)
  const [movieTab, setMovieTab] = useState('now')
  const [showtimeTab, setShowtimeTab] = useState('all')
  const [bookingStep, setBookingStep] = useState(0)
  const intervalRef = useRef(null)

  /* Auto-slide */
  const startInterval = () => {
    intervalRef.current = setInterval(() => {
      changeSlide((prev) => (prev + 1) % SLIDES.length)
    }, 5000)
  }

  useEffect(() => {
    startInterval()
    return () => clearInterval(intervalRef.current)
  }, [])

  const changeSlide = (updater) => {
    setSliding(true)
    setTimeout(() => {
      setSlide(updater)
      setSliding(false)
    }, 350)
  }

  const goSlide = (dir) => {
    clearInterval(intervalRef.current)
    changeSlide((prev) => (prev + dir + SLIDES.length) % SLIDES.length)
    startInterval()
  }

  const current = SLIDES[slide]

  return (
    <div className='home-page'>

      {/* ── AI Float Button ── */}
      <Link to='/ai-assistant' className='ai-float-btn'>
        <span className='ai-float-icon'><FaRobot /></span>
        <span className='ai-float-label'>AI Assistant</span>
      </Link>

      {/* ══════════════════════════════════════════
          HERO SLIDER
      ══════════════════════════════════════════ */}
      <section className='hero-section'>
        <div className='hero-slider' style={{ background: current.bg }}>
          {/* Animated blobs */}
          <div className='hero-blob blob-1' style={{ background: current.accent + '33' }} />
          <div className='hero-blob blob-2' style={{ background: current.accent + '22' }} />

          <div className={`hero-slide-content${sliding ? ' sliding' : ''}`}>
            <span className='hero-chip' style={{ borderColor: current.accent + '88', color: current.accent }}>
              {current.label}
            </span>
            <h1 className='hero-title'>{current.title}</h1>
            <p className='hero-desc'>{current.desc}</p>
            <div className='hero-meta'>
              <span className='hero-meta-item'><FaStar style={{ color: '#fbbf24' }} /> {current.rating}</span>
              <span className='hero-meta-sep'>·</span>
              <span className='hero-meta-item'>{current.genre}</span>
              <span className='hero-meta-sep'>·</span>
              <span className='hero-meta-item'><FaClock /> {current.duration}</span>
            </div>
            <div className='hero-actions'>
              <Link to={`/movie/${current.id}`} className='hero-btn-primary' style={{ background: current.accent, color: '#0f172a' }}>
                <FaPlay /> Xem ngay
              </Link>
              <Link to='/Bookings/Booking' className='hero-btn-secondary'>
                <FaTicketAlt /> Mua vé
              </Link>
            </div>
          </div>

          {/* Dots */}
          <div className='hero-dots'>
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`hero-dot${i === slide ? ' active' : ''}`}
                style={i === slide ? { background: current.accent } : {}}
                onClick={() => { clearInterval(intervalRef.current); changeSlide(i); startInterval() }}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div className='hero-counter'>{slide + 1} / {SLIDES.length}</div>
        </div>

        {/* Quick Booking */}
        <aside className='quick-book-card'>
          <div className='qb-header'>
            <FaTicketAlt className='qb-icon' />
            <div>
              <h2>Đặt vé nhanh</h2>
              <p>Chỉ vài bước để có vé xem phim</p>
            </div>
          </div>

          <div className='qb-steps'>
            {BOOKING_STEPS.map((s, i) => (
              <button
                key={i}
                className={`qb-step${bookingStep === i ? ' active' : ''}${bookingStep > i ? ' done' : ''}`}
                onClick={() => setBookingStep(i)}
              >
                <span className='qb-step-num'>{bookingStep > i ? '✓' : i + 1}</span>
                <span>{s}</span>
              </button>
            ))}
          </div>

          <Link to='/Bookings/Booking' className='qb-cta'>
            <FaTicketAlt /> Tiến hành đặt vé
          </Link>

          <div className='qb-promo-hint'>
            <MdLocalOffer />
            <span>Thành viên Gold giảm 20% hôm nay</span>
          </div>
        </aside>
      </section>

      {/* ══════════════════════════════════════════
          PHIM ĐANG / SẮP CHIẾU
      ══════════════════════════════════════════ */}
      <section className='movies-section'>
        <div className='sec-header'>
          <div className='sec-title-group'>
            <h2>Phim nổi bật</h2>
            <p>Cập nhật mới nhất tháng 6/2026</p>
          </div>
          <div className='sec-tabs'>
            <button className={`sec-tab${movieTab === 'now' ? ' active' : ''}`} onClick={() => setMovieTab('now')}>
              Đang chiếu
            </button>
            <button className={`sec-tab${movieTab === 'soon' ? ' active' : ''}`} onClick={() => setMovieTab('soon')}>
              Sắp chiếu
            </button>
          </div>
          <Link to='/Films/Film' className='sec-link'>Xem tất cả →</Link>
        </div>

        <div className='movies-grid'>
          {NOW_SHOWING.map((m) => (
            <Link to={`/movie/${m.id}`} className='movie-card' key={m.id}>
              {m.hot && <span className='movie-hot'><FaFire /> HOT</span>}
              <div className='movie-poster'>
                <div className='movie-poster-placeholder'>
                  <FaPlay className='poster-play' />
                </div>
                <span className='movie-age'>{m.age}</span>
              </div>
              <div className='movie-info'>
                <div className='movie-title'>{m.title}</div>
                <div className='movie-genre'>{m.genre}</div>
                <div className='movie-footer'>
                  <span className='movie-rating'>
                    <FaStar style={{ color: '#fbbf24' }} /> {m.rating}
                    <span className='movie-votes'>({m.votes})</span>
                  </span>
                  <button className='movie-ticket-btn' onClick={(e) => { e.preventDefault() }}>
                    <FaTicketAlt />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SUẤT CHIẾU + PROMO
      ══════════════════════════════════════════ */}
      <section className='lower-section'>
        {/* Showtime */}
        <div className='showtime-card'>
          <div className='showtime-top'>
            <div>
              <h3><FaMapMarkerAlt style={{ color: '#7c3aed' }} /> Lunexa – Đà Nẵng</h3>
              <p className='showtime-date'>Hôm nay, Chủ nhật 07/06/2026</p>
            </div>
            <div className='showtime-format-tabs'>
              {['all', '2D', '3D', 'IMAX'].map((f) => (
                <button
                  key={f}
                  className={`fmt-tab${showtimeTab === f ? ' active' : ''}`}
                  style={showtimeTab === f && f !== 'all' ? { background: FORMAT_COLORS[f], borderColor: FORMAT_COLORS[f] } : {}}
                  onClick={() => setShowtimeTab(f)}
                >
                  {f === 'all' ? 'Tất cả' : f}
                </button>
              ))}
            </div>
          </div>

          <div className='showtime-list'>
            {SHOWTIMES[showtimeTab].map((row) => (
              <div key={row.id} className='showtime-row'>
                <div className='st-movie-info'>
                  <span className='st-movie-title'>{row.title}</span>
                  <span className='st-format-badge' style={{ background: FORMAT_COLORS[row.format] + '22', color: FORMAT_COLORS[row.format] }}>
                    {row.format}
                  </span>
                </div>
                <div className='st-times'>
                  {row.times.map((t) => (
                    <Link key={t} to='/Bookings/Booking' className='st-time-btn'>{t}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Link to='/cinemas' className='showtime-more-link'>Xem tất cả rạp →</Link>
        </div>

        {/* Promo */}
        <aside className='promo-aside'>
          <div className='promo-header'>
            <MdLocalOffer className='promo-icon' />
            <h3>Ưu đãi hôm nay</h3>
          </div>
          <div className='promo-list'>
            {PROMOS.map((pr) => (
              <div key={pr.id} className='promo-item'>
                <span className='promo-emoji'>{pr.emoji}</span>
                <div className='promo-body'>
                  <div className='promo-title-row'>
                    <span className='promo-title'>{pr.title}</span>
                    <span className='promo-tag'>{pr.tag}</span>
                  </div>
                  <span className='promo-desc'>{pr.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <Link to='/Membership' className='promo-membership-btn'>
            <span>👑</span> Xem ưu đãi thành viên
          </Link>
        </aside>
      </section>

      {/* ══════════════════════════════════════════
          STATS / INFO STRIP
      ══════════════════════════════════════════ */}
      <section className='stats-section'>
        {[
          { num: '50+', label: 'Phim đang chiếu', icon: '🎬' },
          { num: '12', label: 'Rạp chiếu phim', icon: '🏢' },
          { num: '200K+', label: 'Khách hàng tin dùng', icon: '❤️' },
          { num: '4.9★', label: 'Đánh giá trung bình', icon: '⭐' },
        ].map((s, i) => (
          <div key={i} className='stat-card'>
            <span className='stat-icon'>{s.icon}</span>
            <span className='stat-num'>{s.num}</span>
            <span className='stat-label'>{s.label}</span>
          </div>
        ))}
      </section>

    </div>
  )
}
