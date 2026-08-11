import { db } from '../../../config/db.js'

const KNOWLEDGE_CACHE_MS = 60 * 1000
const knowledgeCache = new Map()

const MOVIE_CARD_INTENT = /phim|xem gi|goi y|de xuat|tu van|lich chieu|suat chieu|dat ve|dien vien|dao dien|the loai|hoat hinh|hanh dong|kinh di|tinh cam|hai|gia dinh/
const SEARCH_STOP_WORDS = new Set([
  'phim', 'xem', 'gi', 'nao', 'hay', 'cho', 'toi', 'minh', 'ban', 'co', 'khong', 'mot', 'nhung',
  'dang', 'sap', 'chieu', 'goi', 'y', 'de', 'xuat', 'tu', 'van', 've', 'lich', 'suat', 'the', 'loai',
])

const clean = (value, max = 150) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, max)

const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`
const formatDateTime = (value) => new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  dateStyle: 'short',
  timeStyle: 'short',
}).format(new Date(value))

const safeQuery = async (sql, params = []) => {
  try {
    const [rows] = await db.query(sql, params)
    return rows
  } catch (error) {
    // Một số dữ liệu (như khuyến mãi) có thể chưa được khởi tạo ở DB cũ.
    console.warn('Sweetstar AI data query skipped:', error?.code || error?.message)
    return []
  }
}

const normalizeSearchText = (value) => clean(value, 500)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/[^a-z0-9]+/gi, ' ')
  .trim()
  .toLowerCase()

export const getMovieRecommendations = async (question = '') => {
  const normalizedQuestion = normalizeSearchText(question)
  if (!MOVIE_CARD_INTENT.test(normalizedQuestion)) return []

  const movies = await safeQuery(`
    SELECT
      m.movie_id,
      m.title,
      m.poster,
      m.description,
      m.duration,
      m.age_limit,
      m.status,
      m.release_date,
      COALESCE(
        GROUP_CONCAT(DISTINCT mc.category_name ORDER BY mc.category_name SEPARATOR ', '),
        ''
      ) AS categories,
      COALESCE(ROUND(AVG(r.rating), 1), 0) AS rating,
      COUNT(DISTINCT r.review_id) AS review_count
    FROM Movies m
    LEFT JOIN Movie_Category_Detail mcd ON m.movie_id = mcd.movie_id
    LEFT JOIN Movie_Categories mc ON mc.category_id = mcd.category_id
    LEFT JOIN Reviews r ON r.movie_id = m.movie_id
    WHERE m.is_deleted = 0
      AND m.is_hidden = 0
      AND m.status IN ('now_showing', 'coming_soon')
    GROUP BY
      m.movie_id, m.title, m.poster, m.description, m.duration, m.age_limit,
      m.status, m.release_date
    ORDER BY
      FIELD(m.status, 'now_showing', 'coming_soon'),
      rating DESC,
      m.release_date DESC,
      m.movie_id DESC
    LIMIT 36
  `)

  if (!movies.length) return []

  const queryTokens = normalizedQuestion
    .split(' ')
    .filter((token) => token.length > 1 && !SEARCH_STOP_WORDS.has(token))
  const wantsComingSoon = /sap chieu|chua chieu|coming soon/.test(normalizedQuestion)
  const wantsNowShowing = /dang chieu|hom nay|dat ve|lich chieu|suat chieu/.test(normalizedQuestion)

  const rankedMovies = movies.map((movie, index) => {
    const title = normalizeSearchText(movie.title)
    const categories = normalizeSearchText(movie.categories)
    const description = normalizeSearchText(movie.description)
    let score = Number(movie.rating || 0) + Math.max(0, 4 - index * 0.08)

    queryTokens.forEach((token) => {
      if (title.includes(token)) score += 8
      if (categories.includes(token)) score += 5
      if (description.includes(token)) score += 1
    })

    if (wantsComingSoon && movie.status === 'coming_soon') score += 10
    if (wantsNowShowing && movie.status === 'now_showing') score += 10

    return { movie, score }
  })

  return rankedMovies
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map(({ movie }) => ({
      id: Number(movie.movie_id),
      title: clean(movie.title, 180),
      poster: clean(movie.poster, 500),
      duration: Number(movie.duration || 0),
      ageLimit: clean(movie.age_limit, 20),
      status: movie.status,
      categories: clean(movie.categories, 160)
        .split(',')
        .map((category) => category.trim())
        .filter(Boolean),
      rating: Number(movie.review_count || 0) > 0 ? Number(movie.rating || 0) : null,
      reviewCount: Number(movie.review_count || 0),
    }))
}

export const getSweetstarKnowledge = async (question = '') => {
  const text = clean(question, 400).toLowerCase()
  const wantsShowtimes = /suất|lịch|giờ|mấy giờ|hôm nay|ngày mai|chiếu/.test(text)
  const wantsMovies = /phim|đang chiếu|sắp chiếu|nội dung|diễn viên|đạo diễn/.test(text)
  const wantsCinemas = /rạp|địa chỉ|chi nhánh|ở đâu|thành phố/.test(text)
  const wantsCombos = /combo|bắp|nước|popcorn|đồ ăn/.test(text)
  const wantsPromotions = /ưu đãi|khuyến mãi|giảm giá|voucher|mã /.test(text)
  const isGeneralQuestion = !wantsShowtimes && !wantsMovies && !wantsCinemas && !wantsCombos && !wantsPromotions
  const cacheKey = [wantsShowtimes, wantsMovies, wantsCinemas, wantsCombos, wantsPromotions].join(':')
  const cachedKnowledge = knowledgeCache.get(cacheKey)

  if (cachedKnowledge?.expiresAt > Date.now()) {
    return cachedKnowledge.value
  }

  const [movies, cinemas, showtimes, combos, promotions] = await Promise.all([
    (wantsMovies || wantsShowtimes || isGeneralQuestion) ? safeQuery(`
      SELECT title, status, duration, age_limit, language
      FROM Movies
      WHERE status IN ('now_showing', 'coming_soon')
      ORDER BY FIELD(status, 'now_showing', 'coming_soon'), release_date ASC, movie_id DESC
      LIMIT 8
    `) : Promise.resolve([]),
    (wantsCinemas || wantsShowtimes) ? safeQuery(`
      SELECT cinema_name, address, city, phone
      FROM Cinemas
      WHERE status = 'active'
      ORDER BY cinema_name ASC
      LIMIT 6
    `) : Promise.resolve([]),
    (wantsShowtimes || isGeneralQuestion) ? safeQuery(`
      SELECT m.title AS movie_title, c.cinema_name, r.room_name, r.room_type,
             s.start_time, s.available_seats, s.price AS price
      FROM Showtimes s
      JOIN Movies m ON m.movie_id = s.movie_id
      JOIN Rooms r ON r.room_id = s.room_id
      JOIN Cinemas c ON c.cinemas_id = r.cinema_id
      WHERE s.status = 'active' AND s.start_time >= NOW()
      ORDER BY s.start_time ASC
      LIMIT 12
    `) : Promise.resolve([]),
    wantsCombos ? safeQuery(`
      SELECT combo_name, description, price
      FROM Combos
      WHERE is_active = 1
      ORDER BY sort_order ASC, combo_id ASC
      LIMIT 6
    `) : Promise.resolve([]),
    (wantsPromotions || wantsCombos) ? safeQuery(`
      SELECT code, title, description, discount_type, discount_value, min_order, end_date
      FROM Promotions
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= CURDATE())
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY end_date ASC
      LIMIT 6
    `) : Promise.resolve([]),
  ])

  const timestamp = `THỜI ĐIỂM DỮ LIỆU: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' }).format(new Date())}.`
  const movieSection = movies.length
      ? `PHIM:\n${movies.map((movie) => `- ${clean(movie.title)} (${movie.status === 'now_showing' ? 'đang chiếu' : 'sắp chiếu'}${movie.duration ? `, ${movie.duration} phút` : ''}${movie.age_limit ? `, ${movie.age_limit}+` : ''}${movie.language ? `, ${clean(movie.language, 30)}` : ''})`).join('\n')}`
      : 'PHIM: Chưa có dữ liệu phim để tư vấn.'
  const cinemaSection = cinemas.length
      ? `RẠP:\n${cinemas.map((cinema) => `- ${clean(cinema.cinema_name)} — ${clean(cinema.address)}${cinema.city ? `, ${clean(cinema.city, 40)}` : ''}${cinema.phone ? ` (${clean(cinema.phone, 30)})` : ''}`).join('\n')}`
      : 'RẠP: Chưa có rạp đang hoạt động.'
  const showtimeSection = showtimes.length
      ? `SUẤT CHIẾU SẮP TỚI:\n${showtimes.map((showtime) => `- ${formatDateTime(showtime.start_time)} | ${clean(showtime.movie_title)} | ${clean(showtime.cinema_name)} | ${clean(showtime.room_name)} ${clean(showtime.room_type, 15)} | ${formatMoney(showtime.price)} | còn ${Number(showtime.available_seats || 0)} ghế`).join('\n')}`
      : 'SUẤT CHIẾU: Chưa có suất chiếu sắp tới trong dữ liệu.'
  const comboSection = combos.length
      ? `COMBO ĐANG BÁN:\n${combos.map((combo) => `- ${clean(combo.combo_name)}: ${formatMoney(combo.price)}${combo.description ? ` — ${clean(combo.description)}` : ''}`).join('\n')}`
      : 'COMBO: Chưa có combo đang hoạt động.'
  const promotionSection = promotions.length
      ? `ƯU ĐÃI HIỆN CÓ:\n${promotions.map((promotion) => `- ${clean(promotion.title)}${promotion.code ? ` (mã ${clean(promotion.code, 50)})` : ''}: ${promotion.discount_type === 'percent' ? `${Number(promotion.discount_value || 0)}%` : formatMoney(promotion.discount_value)}${promotion.min_order ? `, đơn từ ${formatMoney(promotion.min_order)}` : ''}${promotion.end_date ? `, đến ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(new Date(promotion.end_date))}` : ''}${promotion.description ? ` — ${clean(promotion.description)}` : ''}`).join('\n')}`
      : 'ƯU ĐÃI: Chưa có ưu đãi đang áp dụng trong dữ liệu.'

  const sections = [timestamp]
  if (wantsMovies || wantsShowtimes || isGeneralQuestion) sections.push(movieSection)
  if (wantsCinemas || wantsShowtimes) sections.push(cinemaSection)
  if (wantsShowtimes || isGeneralQuestion) sections.push(showtimeSection)
  if (wantsCombos) sections.push(comboSection)
  if (wantsPromotions || wantsCombos) sections.push(promotionSection)

  const knowledge = {
    value: sections.join('\n\n'),
    expiresAt: Date.now() + KNOWLEDGE_CACHE_MS,
  }
  knowledgeCache.set(cacheKey, knowledge)
  return knowledge.value
}
