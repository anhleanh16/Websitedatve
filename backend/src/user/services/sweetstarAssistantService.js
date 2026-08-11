import { db } from '../../../config/db.js'

const KNOWLEDGE_CACHE_MS = 60 * 1000
const knowledgeCache = new Map()

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
