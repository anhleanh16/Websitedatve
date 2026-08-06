import { db } from '../../../config/db.js'

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

export const getSweetstarKnowledge = async () => {
  const [movies, cinemas, showtimes, combos, promotions] = await Promise.all([
    safeQuery(`
      SELECT title, status, duration, age_limit, language
      FROM Movies
      WHERE status IN ('now_showing', 'coming_soon')
      ORDER BY FIELD(status, 'now_showing', 'coming_soon'), release_date ASC, movie_id DESC
      LIMIT 12
    `),
    safeQuery(`
      SELECT cinema_name, address, city, phone
      FROM Cinemas
      WHERE status = 'active'
      ORDER BY cinema_name ASC
      LIMIT 12
    `),
    safeQuery(`
      SELECT m.title AS movie_title, c.cinema_name, r.room_name, r.room_type,
             s.start_time, s.available_seats, s.price AS price
      FROM Showtimes s
      JOIN Movies m ON m.movie_id = s.movie_id
      JOIN Rooms r ON r.room_id = s.room_id
      JOIN Cinemas c ON c.cinemas_id = r.cinema_id
      WHERE s.status = 'active' AND s.start_time >= NOW()
      ORDER BY s.start_time ASC
      LIMIT 24
    `),
    safeQuery(`
      SELECT combo_name, description, price
      FROM Combos
      WHERE is_active = 1
      ORDER BY sort_order ASC, combo_id ASC
      LIMIT 12
    `),
    safeQuery(`
      SELECT code, title, description, discount_type, discount_value, min_order, end_date
      FROM Promotions
      WHERE status = 'active'
        AND (start_date IS NULL OR start_date <= CURDATE())
        AND (end_date IS NULL OR end_date >= CURDATE())
      ORDER BY end_date ASC
      LIMIT 10
    `),
  ])

  const sections = [
    `THỜI ĐIỂM DỮ LIỆU: ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' }).format(new Date())}.`,
    movies.length
      ? `PHIM:\n${movies.map((movie) => `- ${clean(movie.title)} (${movie.status === 'now_showing' ? 'đang chiếu' : 'sắp chiếu'}${movie.duration ? `, ${movie.duration} phút` : ''}${movie.age_limit ? `, ${movie.age_limit}+` : ''}${movie.language ? `, ${clean(movie.language, 30)}` : ''})`).join('\n')}`
      : 'PHIM: Chưa có dữ liệu phim để tư vấn.',
    cinemas.length
      ? `RẠP:\n${cinemas.map((cinema) => `- ${clean(cinema.cinema_name)} — ${clean(cinema.address)}${cinema.city ? `, ${clean(cinema.city, 40)}` : ''}${cinema.phone ? ` (${clean(cinema.phone, 30)})` : ''}`).join('\n')}`
      : 'RẠP: Chưa có rạp đang hoạt động.',
    showtimes.length
      ? `SUẤT CHIẾU SẮP TỚI:\n${showtimes.map((showtime) => `- ${formatDateTime(showtime.start_time)} | ${clean(showtime.movie_title)} | ${clean(showtime.cinema_name)} | ${clean(showtime.room_name)} ${clean(showtime.room_type, 15)} | ${formatMoney(showtime.price)} | còn ${Number(showtime.available_seats || 0)} ghế`).join('\n')}`
      : 'SUẤT CHIẾU: Chưa có suất chiếu sắp tới trong dữ liệu.',
    combos.length
      ? `COMBO ĐANG BÁN:\n${combos.map((combo) => `- ${clean(combo.combo_name)}: ${formatMoney(combo.price)}${combo.description ? ` — ${clean(combo.description)}` : ''}`).join('\n')}`
      : 'COMBO: Chưa có combo đang hoạt động.',
    promotions.length
      ? `ƯU ĐÃI HIỆN CÓ:\n${promotions.map((promotion) => `- ${clean(promotion.title)}${promotion.code ? ` (mã ${clean(promotion.code, 50)})` : ''}: ${promotion.discount_type === 'percent' ? `${Number(promotion.discount_value || 0)}%` : formatMoney(promotion.discount_value)}${promotion.min_order ? `, đơn từ ${formatMoney(promotion.min_order)}` : ''}${promotion.end_date ? `, đến ${new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' }).format(new Date(promotion.end_date))}` : ''}${promotion.description ? ` — ${clean(promotion.description)}` : ''}`).join('\n')}`
      : 'ƯU ĐÃI: Chưa có ưu đãi đang áp dụng trong dữ liệu.',
  ]

  return sections.join('\n\n')
}
