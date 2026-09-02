import { formatMovieTitle } from '../../../utils/movieTitle.js'
import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import QuickBookWidget from '../../Components/QuickBookWidget/QuickBookWidget'
import AutoMarqueeText from '../../Components/AutoMarqueeText/AutoMarqueeText'
import {
  FaPlay, FaTicketAlt, FaStar, FaMapMarkerAlt, FaClock,
  FaFire, FaChevronLeft, FaChevronRight, FaTag, FaGift, FaBolt, FaEye
} from 'react-icons/fa'
import { MdLocalOffer } from 'react-icons/md'
import { useSelector } from 'react-redux'
import { userNewsService, userMovieService, userCinemaService, userPromotionService, userComboService, userShowtimeService } from '../../services/userApi'
import { blogService } from '../../services/blogService'
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
  {
    key: 'spotlight',
    label: 'Nổi bật',
    color: '#06b6d4',
    icon: '✨',
    categories: ['coming_soon', 'review', 'announcement'],
    useLatestAsFallback: true,
  },
]

const HOME_BLOG_PRIORITY = ['guide', 'payment', 'cinema']

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

const sanitizeNewsExcerpt = (value) => {
  if (!value) return ''

  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

const formatBlogCategoryFallback = (value = '') => {
  const text = String(value).replace(/_/g, ' ').trim()
  if (!text) return 'Blog'
  return text.charAt(0).toUpperCase() + text.slice(1)
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
  excerpt: sanitizeNewsExcerpt(item.short_description),
})

const normalizeHomeBlog = (item, categoryMap = {}) => ({
  id: item.blog_id,
  slug: item.slug,
  title: item.title || 'Bài viết mới',
  image: item.thumbnail ? toAbsoluteAssetUrl(item.thumbnail) : '',
  category: item.category,
  categoryLabel: categoryMap[item.category] || formatBlogCategoryFallback(item.category),
  time: formatRelativeTime(item.created_at),
  views: Number(item.views || 0),
  excerpt: sanitizeNewsExcerpt(item.summary || item.content || ''),
})

const buildHeroBackground = (poster, fallbackBg) =>
  poster
    ? `linear-gradient(90deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.76) 36%, rgba(15,23,42,0.9) 100%), url(${poster}) center/cover no-repeat`
    : fallbackBg

const normalizeMovie = (movie) => ({
  id: movie.movie_id,
  title: formatMovieTitle(movie.title),
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
        title: 'Khám phá phim mới tại Sweetstar Movie',
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
        title: formatMovieTitle(item.movie_title),
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

const buildMiniAiReply = (message) => {
  const text = String(message || '').toLowerCase()

  if (text.includes('suất chiếu') || text.includes('lich chieu')) {
    return 'Bạn có thể xem suất chiếu ngay ở khối "Suất chiếu hôm nay" tại trang chủ, chọn rạp và định dạng 2D/3D/IMAX để lọc nhanh.'
  }

  if (text.includes('đặt vé') || text.includes('dat ve')) {
    return 'Để đặt vé nhanh: chọn phim -> chọn suất chiếu -> chọn ghế -> thêm combo -> thanh toán. Nếu cần, mình có thể hướng dẫn từng bước chi tiết.'
  }

  if (text.includes('khuyến mãi') || text.includes('uu dai') || text.includes('ưu đãi')) {
    return 'Bạn xem ưu đãi tại mục "Ưu đãi hôm nay" ở cột phải. Mình cũng có thể gợi ý ưu đãi phù hợp theo loại vé bạn muốn mua.'
  }

  return 'Mình là AI Assistant mini. Bạn có thể hỏi về phim đang chiếu, suất chiếu, đặt vé, combo và ưu đãi.'
}

export default function Home() {
  const selectedCinema = useSelector((s) => s.cinema.selectedCinema)
  const location = useLocation()
  const navigate = useNavigate()

  const handleBookingClick = (e, movieId) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(`/movie/${movieId}`, { state: { scrollToSchedule: true } })
  }

  const [slide,       setSlide]       = useState(0)
  const [sliding,     setSliding]     = useState(false)
  const [movieTab,    setMovieTab]    = useState('now')
  const [showtimeTab, setShowtimeTab] = useState('all')
  const [movieOff,    setMovieOff]    = useState(0)
  const [movieSlideDirection, setMovieSlideDirection] = useState('next')
  const [movieAutoplayReset, setMovieAutoplayReset] = useState(0)
  const [isMobileMovieCarousel, setIsMobileMovieCarousel] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
  )
  const [adSlide,     setAdSlide]     = useState(0)
  const [nowShowing,  setNowShowing]  = useState([])
  const [comingSoon,  setComingSoon]  = useState([])
  const [cinemas,     setCinemas]     = useState([])
  const [selectedCinemaId, setSelectedCinemaId] = useState('')
  const [showtimes,   setShowtimes]   = useState([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [loadingShowtimes, setLoadingShowtimes] = useState(false)
  const [homeNews, setHomeNews] = useState([])
  const [homeBlogs, setHomeBlogs] = useState([])
  const [moviesError, setMoviesError] = useState('')
  const [showtimesError, setShowtimesError] = useState('')
  const [newsError, setNewsError] = useState('')
  const [blogError, setBlogError] = useState('')
  const [isAiOpen, setIsAiOpen] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiMode, setAiMode] = useState('voice')
  const [voiceSupported, setVoiceSupported] = useState(true)
  const [voiceListening, setVoiceListening] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('Sẵn sàng hội thoại bằng giọng nói')
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào, mình là AI Assistant. Bạn muốn tìm phim, suất chiếu hay ưu đãi?',
    },
  ])

  const heroTimer = useRef(null)
  const adTimer   = useRef(null)
  const aiReplyTimer = useRef(null)
  const aiMessagesEndRef = useRef(null)
  const speechRecognitionRef = useRef(null)
  const movieSwipeStartRef = useRef(null)
  const movieSwipeAtRef = useRef(0)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)')
    const handleChange = (event) => setIsMobileMovieCarousel(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('chatbox') === '1') {
      setIsAiOpen(true)
    }
  }, [location.search])

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
    const loadHomeBlogs = async () => {
      setBlogError('')

      try {
        const [blogData, categoryData] = await Promise.all([
          blogService.getPublished(1),
          blogService.getCategoriesPublic(),
        ])

        const categoryMap = Object.fromEntries(
          (categoryData?.categories || []).map((item) => [
            item.category_name,
            item.description || formatBlogCategoryFallback(item.category_name),
          ]),
        )

        const nextBlogs = Array.isArray(blogData?.blogs)
          ? blogData.blogs.map((item) => normalizeHomeBlog(item, categoryMap))
          : []
        setHomeBlogs(nextBlogs)
      } catch (err) {
        console.error(err)
        setHomeBlogs([])
        setBlogError('Không thể tải blog từ database.')
      }
    }

    loadHomeBlogs()
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
  const spiderManMovie = [...nowShowing, ...comingSoon].find((movie) =>
    /spider[\s-]?man|người nhện/i.test(String(movie.title || '')),
  )
  const heroSlides = useMemo(
    () => buildHeroSlides([...nowShowing, ...comingSoon]),
    [nowShowing, comingSoon],
  )
  const visibleMovieCount = isMobileMovieCarousel ? 1 : VISIBLE
  const maxOff = Math.max(featuredMovies.length - visibleMovieCount, 0)
  const visibleMovies = isMobileMovieCarousel && featuredMovies.length > 0
    ? (featuredMovies.length > 1 ? [-1, 0, 1] : [0]).map((offset) => {
        const index = (movieOff + offset + featuredMovies.length) % featuredMovies.length
        return {
          ...featuredMovies[index],
          carouselPosition: offset < 0 ? 'previous' : offset > 0 ? 'next' : 'current',
          carouselKey: `${featuredMovies[index].id}-${offset}`,
        }
      })
    : featuredMovies.slice(movieOff, movieOff + visibleMovieCount)
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
      HOME_NEWS_GROUPS.map((group) => {
        const categories = group.categories || [group.key]
        const matchingItems = homeNews.filter((item) => categories.includes(item.category))

        return {
          ...group,
          items: (matchingItems.length > 0 || !group.useLatestAsFallback
            ? matchingItems
            : homeNews
          ).slice(0, 3),
        }
      }),
    [homeNews],
  )
  const featuredHomeBlogs = useMemo(() => {
    const score = (category = '') => {
      const index = HOME_BLOG_PRIORITY.indexOf(category)
      return index === -1 ? HOME_BLOG_PRIORITY.length + 1 : index
    }

    return [...homeBlogs]
      .sort((a, b) => {
        const scoreDiff = score(a.category) - score(b.category)
        if (scoreDiff !== 0) return scoreDiff
        return b.id - a.id
      })
      .slice(0, 3)
  }, [homeBlogs])

  useEffect(() => {
    setMovieOff((prev) => Math.min(prev, maxOff))
  }, [maxOff, movieTab])

  useEffect(() => {
    if (!isMobileMovieCarousel || featuredMovies.length <= 1) return undefined
    const timer = window.setInterval(() => {
      setMovieSlideDirection('next')
      setMovieOff((position) => (position + 1) % featuredMovies.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [isMobileMovieCarousel, featuredMovies.length, movieTab, movieAutoplayReset])

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

  useEffect(() => {
    if (!isAiOpen) return
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [aiMessages, aiTyping, isAiOpen])

  useEffect(() => {
    return () => {
      if (aiReplyTimer.current) {
        clearTimeout(aiReplyTimer.current)
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (aiMode !== 'voice') {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop()
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      setVoiceListening(false)
    }
  }, [aiMode])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceSupported(false)
      setVoiceStatus('Thiết bị hoặc trình duyệt chưa hỗ trợ voice chat')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'vi-VN'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setVoiceListening(true)
      setVoiceStatus('Đang nghe... hãy nói ngay')
    }

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim() || ''
      if (!transcript) {
        setVoiceStatus('Không nghe rõ. Bạn nói lại giúp mình nhé')
        return
      }

      setVoiceStatus('Đã nhận câu hỏi, AI đang phản hồi bằng giọng nói...')
      setAiTyping(true)

      const replyText = buildMiniAiReply(transcript)
      if (aiReplyTimer.current) {
        clearTimeout(aiReplyTimer.current)
      }

      aiReplyTimer.current = setTimeout(() => {
        setAiTyping(false)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(replyText)
          utterance.lang = 'vi-VN'
          utterance.rate = 1
          utterance.pitch = 1
          window.speechSynthesis.cancel()
          window.speechSynthesis.speak(utterance)
          setVoiceStatus('AI đã trả lời xong. Bạn có thể bấm micro để nói tiếp')
        } else {
          setVoiceStatus('Không thể phát giọng nói trên trình duyệt này')
        }
      }, 360)
    }

    recognition.onerror = (event) => {
      if (event?.error === 'not-allowed') {
        setVoiceStatus('Bạn cần cấp quyền micro để dùng voice chat')
      } else if (event?.error === 'no-speech') {
        setVoiceStatus('Không phát hiện giọng nói. Hãy thử lại')
      } else {
        setVoiceStatus('Voice chat gặp lỗi, vui lòng thử lại')
      }
      setVoiceListening(false)
      setAiTyping(false)
    }

    recognition.onend = () => {
      setVoiceListening(false)
    }

    speechRecognitionRef.current = recognition

    return () => {
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      recognition.stop()
      speechRecognitionRef.current = null
    }
  }, [])

  /* Movie carousel */
  const goMovies = (dir) => {
    setMovieSlideDirection(dir < 0 ? 'previous' : 'next')
    setMovieOff((position) => {
      if (isMobileMovieCarousel && featuredMovies.length > 1) {
        return (position + dir + featuredMovies.length) % featuredMovies.length
      }
      return Math.min(Math.max(position + dir, 0), maxOff)
    })
  }
  const handleMovieTouchStart = (event) => {
    const touch = event.touches[0]
    movieSwipeStartRef.current = { x: touch.clientX, y: touch.clientY }
  }
  const handleMovieTouchEnd = (event) => {
    if (!isMobileMovieCarousel || !movieSwipeStartRef.current) return
    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - movieSwipeStartRef.current.x
    const deltaY = touch.clientY - movieSwipeStartRef.current.y
    movieSwipeStartRef.current = null
    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return
    event.preventDefault()
    movieSwipeAtRef.current = Date.now()
    setMovieAutoplayReset((value) => value + 1)
    goMovies(deltaX < 0 ? 1 : -1)
  }

  const toggleAiPanel = () => {
    setIsAiOpen((prev) => {
      const next = !prev
      if (!next) {
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop()
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
        setVoiceListening(false)
        setAiTyping(false)
      }
      return next
    })
  }

  const toggleVoiceListening = () => {
    if (!voiceSupported || !speechRecognitionRef.current) return

    if (voiceListening) {
      speechRecognitionRef.current.stop()
      setVoiceStatus('Đã dừng nghe. Bấm micro để nói tiếp')
      return
    }

    try {
      speechRecognitionRef.current.start()
    } catch {
      setVoiceStatus('Voice chat đang bận. Vui lòng thử lại sau 1 giây')
    }
  }

  const handleAiSubmit = (e) => {
    e.preventDefault()
    const message = aiInput.trim()
    if (!message) return

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: message,
    }

    setAiMessages((prev) => [...prev, userMessage])
    setAiInput('')
    setAiTyping(true)

    if (aiReplyTimer.current) {
      clearTimeout(aiReplyTimer.current)
    }

    aiReplyTimer.current = setTimeout(() => {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: buildMiniAiReply(message),
        },
      ])
      setAiTyping(false)
    }, 520)
  }

  return (
    <div className='home-page'>

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

          {/* Spider-Man event */}
          <Link
            className='spiderman-event'
            to={spiderManMovie ? `/movie/${spiderManMovie.id}` : '/Films/Film'}
            aria-label='Khám phá sự kiện Spider-Man: Khởi Đầu Mới'
          >
            <span className='spiderman-web web-left' aria-hidden='true' />
            <span className='spiderman-web web-right' aria-hidden='true' />
            <span className='spiderman-swing-line' aria-hidden='true'>🕷️</span>
            <span className='spiderman-event-sweep' aria-hidden='true' />
            <div className='spiderman-event-content'>
              <span className='spiderman-event-kicker'>SỰ KIỆN ĐẶC BIỆT</span>
              <h2>SPIDER-MAN: KHỞI ĐẦU MỚI</h2>
              <p>Khám phá hành trình mới, lịch chiếu và trải nghiệm điện ảnh đầy kịch tính.</p>
            </div>
            <span className='spiderman-event-cta'>Khám phá ngay <span>→</span></span>
          </Link>

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

            <div
              className={`movies-grid${isMobileMovieCarousel ? ` is-swipe-carousel swipe-${movieSlideDirection}` : ''}`}
              onTouchStart={handleMovieTouchStart}
              onTouchEnd={handleMovieTouchEnd}
              onClickCapture={(event) => {
                if (Date.now() - movieSwipeAtRef.current < 500) {
                  event.preventDefault()
                  event.stopPropagation()
                }
              }}
            >
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
                <Link
                  to={`/movie/${m.id}`}
                  className={`movie-card${m.carouselPosition ? ` carousel-${m.carouselPosition}` : ''}`}
                  key={m.carouselKey || m.id}
                  onClick={(event) => {
                    if (!isMobileMovieCarousel || !m.carouselPosition || m.carouselPosition === 'current') return
                    event.preventDefault()
                    setMovieAutoplayReset((value) => value + 1)
                    goMovies(m.carouselPosition === 'previous' ? -1 : 1)
                  }}
                  aria-label={m.carouselPosition && m.carouselPosition !== 'current' ? `Chuyển đến phim ${m.title}` : undefined}
                >
                  {m.hot && <span className='movie-hot'><FaFire /> HOT</span>}
                  <div
                    className='movie-poster'
                    style={m.poster ? { backgroundImage: `url(${m.poster})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {!m.poster && <div className='movie-poster-placeholder'><FaPlay className='poster-play' /></div>}
                    <span className='movie-age'>{m.age}</span>
                  </div>
                  <div className='movie-info'>
                    <AutoMarqueeText className='movie-title'>{m.title}</AutoMarqueeText>
                    <AutoMarqueeText className='movie-genre'>{m.genre}</AutoMarqueeText>
                    <div className='movie-footer'>
                      <div className='movie-rating-wrap'>
                        {m.rating > 0 ? <StarRating rating={m.rating} /> : <FaStar style={{ color: '#475569', fontSize: '0.7rem' }} />}
                        <span className='movie-rating-num'>{m.rating > 0 ? m.rating : '--'}</span>
                        <span className='movie-votes'>({formatReviewCount(m.reviewCount)})</span>
                      </div>
                      <button className='movie-ticket-btn' onClick={(e) => handleBookingClick(e, m.id)}>
                        <FaTicketAlt /> Đặt vé
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
                    onClick={() => {
                      setMovieSlideDirection(i < movieOff ? 'previous' : 'next')
                      setMovieOff(i)
                      setMovieAutoplayReset((value) => value + 1)
                    }} aria-label={`Trang ${i + 1}`} />
                ))}
              </div>
            )}
            {isMobileMovieCarousel && featuredMovies.length > 1 && (
              <div className='mobile-swipe-hint'>‹ Vuốt để xem phim khác ›</div>
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
                <div key={row.id} className='showtime-block showtime-movie-block'>
                  <div className='sb-movie-header'>
                    <AutoMarqueeText as='span' className='sb-title'>{row.title}</AutoMarqueeText>
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
                <p>Tổng hợp theo 4 chủ đề nổi bật từ hệ thống tin tức.</p>
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
                            <AutoMarqueeText as='span' className='news-tag'>{group.items[0].tag}</AutoMarqueeText>
                            <AutoMarqueeText as='h4' className='news-feature-title' lines={2}>{group.items[0].title}</AutoMarqueeText>
                            {group.items[0].excerpt && <AutoMarqueeText as='p' className='news-feature-excerpt' lines={2}>{group.items[0].excerpt}</AutoMarqueeText>}
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
                              <AutoMarqueeText as='span' className='news-tag'>{n.tag}</AutoMarqueeText>
                              <AutoMarqueeText as='p' className='news-title' lines={2}>{n.title}</AutoMarqueeText>
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

          {/* Blog hữu ích */}
          <div className='home-blog-block'>
            <div className='sec-header'>
              <div className='sec-title-group'>
                <h2>Blog hữu ích</h2>
                <p>Hướng dẫn và chính sách quan trọng giúp bạn đặt vé nhanh hơn.</p>
              </div>
              <Link to='/Blog' className='sec-link'>Xem tất cả →</Link>
            </div>

            <div className='home-blog-grid'>
              {blogError && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  {blogError}
                </div>
              )}

              {!blogError && featuredHomeBlogs.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', opacity: 0.8 }}>
                  Chưa có bài blog để hiển thị.
                </div>
              )}

              {!blogError && featuredHomeBlogs.map((blog) => (
                <Link to={`/blog/${blog.slug}`} key={blog.id} className='home-blog-card'>
                  <div className='home-blog-body'>
                    <AutoMarqueeText as='span' className='news-tag'>{blog.categoryLabel}</AutoMarqueeText>
                    <AutoMarqueeText as='h3' className='home-blog-title' lines={2}>{blog.title}</AutoMarqueeText>
                    <AutoMarqueeText as='p' className='home-blog-excerpt' lines={2}>{blog.excerpt || 'Nội dung đang được cập nhật.'}</AutoMarqueeText>
                    <div className='home-blog-meta'>
                      <span><FaClock /> {blog.time}</span>
                      <span><FaEye /> {blog.views.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>{/* end col-left */}

        {/* ── CỘT PHẢI ── */}
        <aside className='col-right'>

          {/* Đặt vé nhanh */}
          <QuickBookWidget />

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
                      <AutoMarqueeText as='span' className='deal-title'>{d.title}</AutoMarqueeText>
                      <span className='deal-tag' style={{ background: d.color + '22', color: d.color }}>{d.tag}</span>
                    </div>
                    <AutoMarqueeText as='span' className='deal-desc'>{d.desc}</AutoMarqueeText>
                  </div>
                </div>
              ))}
            </div>
            <Link to='/Membership' className='deals-more-btn'>
              <span>👑</span> Xem ưu đãi thành viên
            </Link>
          </div>

          {/* Banner quảng cáo nhỏ tự động slide */}
          <div className='ad-mini-banner ad-mini-card' style={{ borderColor: adCurrent.color + '44', background: adCurrent.color + '0d' }}>
            <div className='ad-mini-icon' style={{ color: adCurrent.color, background: adCurrent.color + '22' }}>
              {adCurrent.icon}
            </div>
            <div className='ad-mini-body'>
              <span className='ad-mini-tag' style={{ background: adCurrent.color + '22', color: adCurrent.color }}>
                {adCurrent.tag}
              </span>
              <AutoMarqueeText className='ad-mini-title'>{adCurrent.title}</AutoMarqueeText>
              <AutoMarqueeText className='ad-mini-desc' lines={2}>{adCurrent.desc}</AutoMarqueeText>
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
