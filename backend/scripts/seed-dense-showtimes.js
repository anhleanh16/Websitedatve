import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const TARGET_PER_MOVIE_PER_CINEMA = 110
const MAX_DAYS_AHEAD = 45
const GAP_MINUTES = 15
const DAY_START_HOUR = 8
const DAY_END_HOUR = 23
const DAY_END_MINUTE = 59

const PRICE_BY_ROOM_TYPE = {
  '2D': 75000,
  '3D': 90000,
  IMAX: 120000,
  VIP: 150000,
}

const addMinutes = (date, minutes) => new Date(date.getTime() + Number(minutes || 0) * 60000)

const cloneDate = (date) => new Date(date.getTime())

const startOfDay = (date) => {
  const next = cloneDate(date)
  next.setHours(DAY_START_HOUR, 0, 0, 0)
  return next
}

const endOfDay = (date) => {
  const next = cloneDate(date)
  next.setHours(DAY_END_HOUR, DAY_END_MINUTE, 0, 0)
  return next
}

const roundUpToQuarterHour = (date) => {
  const next = cloneDate(date)
  const minutes = next.getMinutes()
  const remainder = minutes % 15
  if (remainder !== 0) {
    next.setMinutes(minutes + (15 - remainder))
  }
  next.setSeconds(0, 0)
  return next
}

const normalizeDateKey = (date) => date.toISOString().slice(0, 10)

const buildPricePack = (roomType, basePrice = 0) => {
  const standard = Number(basePrice || PRICE_BY_ROOM_TYPE[roomType] || 80000)
  return {
    price: standard,
    price_standard: standard,
    price_vip: Math.round(standard * 1.25),
    price_couple: Math.round(standard * 1.5),
  }
}

const pickMovieForCinema = (movies, countsByMovieId, roomMinutesRemaining) => {
  const candidates = movies
    .filter((movie) => Number(countsByMovieId.get(movie.movie_id) || 0) < TARGET_PER_MOVIE_PER_CINEMA)
    .filter((movie) => Number(movie.duration || 0) + GAP_MINUTES <= roomMinutesRemaining)
    .sort((a, b) => {
      const countDiff = Number(countsByMovieId.get(a.movie_id) || 0) - Number(countsByMovieId.get(b.movie_id) || 0)
      if (countDiff !== 0) return countDiff
      const durationDiff = Number(a.duration || 0) - Number(b.duration || 0)
      if (durationDiff !== 0) return durationDiff
      return Number(a.movie_id) - Number(b.movie_id)
    })

  return candidates[0] || null
}

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    const [[showtimeColumnsRow]] = await connection.query(
      `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Showtimes' AND COLUMN_NAME IN ('price_standard', 'price_vip', 'price_couple')`,
    )
    const hasStructuredPriceColumns = Number(showtimeColumnsRow?.total || 0) === 3

    const [movies] = await connection.query(
      `
      SELECT movie_id, title, duration
      FROM Movies
      WHERE is_deleted = 0 AND status = 'now_showing'
      ORDER BY duration ASC, movie_id ASC
      `,
    )

    if (!movies.length) {
      console.log('Không có phim đang chiếu để tạo lịch.')
      return
    }

    const [cinemas] = await connection.query(
      `
      SELECT cinemas_id, cinema_name
      FROM Cinemas
      WHERE status = 'active'
      ORDER BY cinemas_id ASC
      `,
    )

    if (!cinemas.length) {
      console.log('Không có rạp active để tạo lịch.')
      return
    }

    const [rooms] = await connection.query(
      `
      SELECT room_id, cinema_id, room_name, room_type, total_seat
      FROM Rooms
      WHERE status = 'active'
      ORDER BY cinema_id ASC, room_id ASC
      `,
    )

    if (!rooms.length) {
      console.log('Không có phòng active để tạo lịch.')
      return
    }

    const cinemaMap = new Map(cinemas.map((cinema) => [Number(cinema.cinemas_id), cinema]))
    const roomsByCinema = new Map()
    for (const room of rooms) {
      const cinemaId = Number(room.cinema_id)
      if (!roomsByCinema.has(cinemaId)) roomsByCinema.set(cinemaId, [])
      roomsByCinema.get(cinemaId).push(room)
    }

    const startMoment = roundUpToQuarterHour(new Date())
    if (startMoment.getHours() < DAY_START_HOUR) {
      startMoment.setHours(DAY_START_HOUR, 0, 0, 0)
    }
    if (startMoment.getHours() > DAY_END_HOUR || (startMoment.getHours() === DAY_END_HOUR && startMoment.getMinutes() > DAY_END_MINUTE)) {
      startMoment.setDate(startMoment.getDate() + 1)
      startMoment.setHours(DAY_START_HOUR, 0, 0, 0)
    }

    const horizonEnd = cloneDate(startMoment)
    horizonEnd.setDate(horizonEnd.getDate() + MAX_DAYS_AHEAD)
    horizonEnd.setHours(DAY_END_HOUR, DAY_END_MINUTE, 0, 0)

    const cinemaMovieCounts = new Map()
    const existingIntervalsByRoom = new Map()

    for (const cinema of cinemas) {
      cinemaMovieCounts.set(Number(cinema.cinemas_id), new Map())
    }

    const [existingShowtimes] = await connection.query(
      `
      SELECT s.showtime_id, s.movie_id, s.room_id, s.start_time, s.end_time, r.cinema_id
      FROM Showtimes s
      JOIN Rooms r ON r.room_id = s.room_id
      WHERE s.start_time >= ? AND s.start_time <= ?
      ORDER BY s.start_time ASC, s.showtime_id ASC
      `,
      [startMoment, horizonEnd],
    )

    for (const row of existingShowtimes) {
      const cinemaId = Number(row.cinema_id)
      const movieId = Number(row.movie_id)
      const roomId = Number(row.room_id)
      const counts = cinemaMovieCounts.get(cinemaId) || new Map()
      counts.set(movieId, Number(counts.get(movieId) || 0) + 1)
      cinemaMovieCounts.set(cinemaId, counts)

      if (!existingIntervalsByRoom.has(roomId)) existingIntervalsByRoom.set(roomId, [])
      existingIntervalsByRoom.get(roomId).push({
        start: new Date(row.start_time),
        endWithGap: addMinutes(new Date(row.end_time), GAP_MINUTES),
      })
    }

    const getRoomIntervals = (roomId) => {
      if (!existingIntervalsByRoom.has(roomId)) {
        existingIntervalsByRoom.set(roomId, [])
      }
      return existingIntervalsByRoom.get(roomId)
    }

    const summary = []
    let insertedCount = 0

    for (const cinema of cinemas) {
      const cinemaId = Number(cinema.cinemas_id)
      const cinemaRooms = roomsByCinema.get(cinemaId) || []
      if (!cinemaRooms.length) continue

      const counts = cinemaMovieCounts.get(cinemaId) || new Map()

      for (let dayOffset = 0; dayOffset <= MAX_DAYS_AHEAD; dayOffset += 1) {
        const dayCursor = cloneDate(startMoment)
        dayCursor.setDate(startMoment.getDate() + dayOffset)

        for (const room of cinemaRooms) {
          const roomId = Number(room.room_id)
          const roomIntervals = getRoomIntervals(roomId)
          let cursor = dayOffset === 0 && normalizeDateKey(dayCursor) === normalizeDateKey(startMoment)
            ? cloneDate(startMoment)
            : startOfDay(dayCursor)

          const dayEnd = endOfDay(dayCursor)

          roomIntervals.sort((a, b) => a.start - b.start)

          while (cursor < dayEnd) {
            while (roomIntervals.length > 0 && cursor < roomIntervals[0].endWithGap) {
              if (cursor >= roomIntervals[0].start && cursor < roomIntervals[0].endWithGap) {
                cursor = new Date(roomIntervals[0].endWithGap)
              } else {
                break
              }
            }

            const roomMinutesRemaining = Math.max(0, Math.floor((dayEnd.getTime() - cursor.getTime()) / 60000))
            const movie = pickMovieForCinema(movies, counts, roomMinutesRemaining)
            if (!movie) {
              break
            }

            const duration = Number(movie.duration || 0)
            const endTime = addMinutes(cursor, duration)
            const endWithGap = addMinutes(endTime, GAP_MINUTES)

            if (endWithGap > dayEnd) {
              break
            }

            const [duplicate] = await connection.query(
              `
              SELECT showtime_id
              FROM Showtimes
              WHERE room_id = ? AND start_time = ?
              LIMIT 1
              `,
              [roomId, cursor],
            )

            if (duplicate.length > 0) {
              roomIntervals.push({ start: cloneDate(cursor), endWithGap: cloneDate(endWithGap) })
              cursor = cloneDate(endWithGap)
              continue
            }

            const prices = buildPricePack(room.room_type, PRICE_BY_ROOM_TYPE[room.room_type])
            const columns = [
              'movie_id',
              'room_id',
              'start_time',
              'end_time',
              'price',
              'available_seats',
              'status',
            ]
            const values = [
              movie.movie_id,
              roomId,
              cursor,
              endTime,
              prices.price,
              Number(room.total_seat || 0),
              'active',
            ]

            if (hasStructuredPriceColumns) {
              columns.splice(5, 0, 'price_standard')
              values.splice(5, 0, prices.price_standard)

              const priceInsertIndex = columns.indexOf('price') + 1
              columns.splice(priceInsertIndex, 0, 'price_vip')
              values.splice(priceInsertIndex, 0, prices.price_vip)

              columns.splice(priceInsertIndex + 1, 0, 'price_couple')
              values.splice(priceInsertIndex + 1, 0, prices.price_couple)
            }

            const placeholders = columns.map(() => '?').join(', ')
            const [result] = await connection.query(
              `INSERT INTO Showtimes (${columns.join(', ')}) VALUES (${placeholders})`,
              values,
            )

            insertedCount += 1
            counts.set(movie.movie_id, Number(counts.get(movie.movie_id) || 0) + 1)
            cinemaMovieCounts.set(cinemaId, counts)
            roomIntervals.push({ start: cloneDate(cursor), endWithGap: cloneDate(endWithGap) })
            cursor = cloneDate(endWithGap)
          }
        }

        const reachedTarget = movies.every((movie) => Number(counts.get(movie.movie_id) || 0) >= TARGET_PER_MOVIE_PER_CINEMA)
        if (reachedTarget) break
      }

      const countsList = movies.map((movie) => ({
        movie: movie.title,
        count: Number(counts.get(movie.movie_id) || 0),
      }))
      summary.push({ cinema: cinemaMap.get(cinemaId)?.cinema_name || cinema.cinema_name, counts: countsList })
    }

    console.log('=== Seed lịch chiếu hoàn tất ===')
    console.log(`Đã thêm mới: ${insertedCount} lịch chiếu`)
    for (const item of summary) {
      console.log(`\n${item.cinema}`)
      for (const row of item.counts) {
        console.log(`- ${row.movie}: ${row.count}`)
      }
    }
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error('Seed lịch chiếu thất bại:', error)
  process.exit(1)
})