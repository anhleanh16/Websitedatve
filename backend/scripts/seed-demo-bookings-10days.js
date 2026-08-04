import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const SUCCESSFUL_ORDERS = 30
const CANCELLED_TICKETS = 20
const BOOKING_PREFIX = 'DEMO10D'

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const randomDateInLast10Days = () => {
  const now = Date.now()
  const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000
  const ts = randomInt(tenDaysAgo, now)
  return new Date(ts)
}

const generateBookingCode = (index) => {
  const p1 = Date.now().toString(36).toUpperCase()
  const p2 = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${BOOKING_PREFIX}-${String(index).padStart(3, '0')}-${p1}${p2}`
}

const pickRandom = (arr) => arr[randomInt(0, arr.length - 1)]

const pickUniqueSeats = (seats, count) => {
  const copy = [...seats]
  const picked = []
  for (let i = 0; i < count && copy.length > 0; i += 1) {
    const idx = randomInt(0, copy.length - 1)
    picked.push(copy[idx])
    copy.splice(idx, 1)
  }
  return picked
}

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    await connection.beginTransaction()

    const [demoOrders] = await connection.execute(
      `SELECT order_id FROM Orders WHERE booking_code LIKE ?`,
      [`${BOOKING_PREFIX}-%`],
    )

    if (demoOrders.length > 0) {
      const ids = demoOrders.map((row) => Number(row.order_id)).filter(Boolean)
      const placeholders = ids.map(() => '?').join(', ')
      await connection.execute(`DELETE FROM Order_Combos WHERE order_id IN (${placeholders})`, ids)
      await connection.execute(`DELETE FROM Tickets WHERE order_id IN (${placeholders})`, ids)
      await connection.execute(`DELETE FROM Orders WHERE order_id IN (${placeholders})`, ids)
    }

    let [users] = await connection.execute(
      `
      SELECT u.id
      FROM User u
      JOIN Roles r ON r.role_id = u.role_id
      WHERE r.role_name = 'user' AND u.status = 'active'
      ORDER BY u.id ASC
      `,
    )

    if (users.length === 0) {
      [users] = await connection.execute(
        `
        SELECT u.id
        FROM User u
        LEFT JOIN Roles r ON r.role_id = u.role_id
        WHERE u.status = 'active'
          AND (r.role_name IS NULL OR r.role_name NOT IN ('admin', 'staff', 'manager', 'technician'))
        ORDER BY u.id ASC
        `,
      )
    }

    if (users.length === 0) {
      [users] = await connection.execute(
        `SELECT id FROM User ORDER BY id ASC`,
      )
    }

    if (users.length === 0) {
      throw new Error('No user account found to seed demo bookings.')
    }

    let [showtimes] = await connection.execute(
      `
      SELECT showtime_id, room_id, COALESCE(price_standard, price, 80000) AS base_price
      FROM Showtimes
      WHERE status = 'active'
      ORDER BY showtime_id ASC
      `,
    )

    if (showtimes.length === 0) {
      [showtimes] = await connection.execute(
        `
        SELECT showtime_id, room_id, COALESCE(price_standard, price, 80000) AS base_price
        FROM Showtimes
        ORDER BY showtime_id ASC
        `,
      )
    }

    if (showtimes.length === 0) {
      throw new Error('No showtime found to seed demo bookings.')
    }

    const roomIds = Array.from(new Set(showtimes.map((s) => Number(s.room_id)).filter(Boolean)))
    const seatMap = new Map()

    if (roomIds.length > 0) {
      const placeholders = roomIds.map(() => '?').join(', ')
      const [seatRows] = await connection.execute(
        `
        SELECT seat_id, room_id, seat_code
        FROM Seats
        WHERE room_id IN (${placeholders}) AND status = 'active'
        ORDER BY room_id ASC, seat_id ASC
        `,
        roomIds,
      )

      for (const seat of seatRows) {
        const roomId = Number(seat.room_id)
        if (!seatMap.has(roomId)) seatMap.set(roomId, [])
        seatMap.get(roomId).push({
          seat_id: Number(seat.seat_id),
          seat_code: String(seat.seat_code || ''),
        })
      }
    }

    let createdOrders = 0
    let createdSuccessOrders = 0
    let createdCancelledTickets = 0

    const createOrderWithTickets = async ({
      orderIndex,
      userId,
      showtime,
      seatCount,
      paymentMethod,
      paymentStatus,
      orderStatus,
      ticketStatus,
    }) => {
      const roomSeats = seatMap.get(Number(showtime.room_id)) || []
      if (roomSeats.length === 0) {
        throw new Error(`No active seats in room ${showtime.room_id}.`)
      }

      const selectedSeats = pickUniqueSeats(roomSeats, Math.min(seatCount, roomSeats.length))
      if (selectedSeats.length === 0) {
        throw new Error('Could not pick seats for demo order.')
      }

      const bookingCode = generateBookingCode(orderIndex)
      const createdAt = randomDateInLast10Days()
      const unitPrice = Number(showtime.base_price || 80000)
      const totalAmount = unitPrice * selectedSeats.length

      const [orderResult] = await connection.execute(
        `
        INSERT INTO Orders
          (user_id, total_amount, payment_method, payment_status, order_date, booking_code, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          Number(userId),
          totalAmount,
          paymentMethod,
          paymentStatus,
          createdAt,
          bookingCode,
          orderStatus,
          createdAt,
        ],
      )

      const orderId = Number(orderResult.insertId)

      for (let i = 0; i < selectedSeats.length; i += 1) {
        const seat = selectedSeats[i]
        await connection.execute(
          `
          INSERT INTO Tickets
            (order_id, showtime_id, seat_id, qr_code, ticket_status, check_in_time)
          VALUES (?, ?, ?, ?, ?, NULL)
          `,
          [
            orderId,
            Number(showtime.showtime_id),
            Number(seat.seat_id),
            `${bookingCode}-${seat.seat_code || i + 1}`,
            ticketStatus,
          ],
        )
      }

      createdOrders += 1
      return {
        seatCount: selectedSeats.length,
        isSuccess: ticketStatus === 'unused',
        isCancelled: ticketStatus === 'cancelled',
      }
    }

    for (let i = 1; i <= SUCCESSFUL_ORDERS; i += 1) {
      const user = pickRandom(users)
      const showtime = pickRandom(showtimes)
      const seatCount = randomInt(1, 3)

      const result = await createOrderWithTickets({
        orderIndex: i,
        userId: Number(user.id),
        showtime,
        seatCount,
        paymentMethod: Math.random() < 0.5 ? 'zalopay' : 'card',
        paymentStatus: 'paid',
        orderStatus: 'confirmed',
        ticketStatus: 'unused',
      })

      if (result.isSuccess) createdSuccessOrders += 1
    }

    for (let i = 1; i <= CANCELLED_TICKETS; i += 1) {
      const user = pickRandom(users)
      const showtime = pickRandom(showtimes)

      const result = await createOrderWithTickets({
        orderIndex: SUCCESSFUL_ORDERS + i,
        userId: Number(user.id),
        showtime,
        seatCount: 1,
        paymentMethod: Math.random() < 0.5 ? 'zalopay' : 'card',
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        ticketStatus: 'cancelled',
      })

      if (result.isCancelled) createdCancelledTickets += result.seatCount
    }

    await connection.commit()

    console.log('Demo booking seed completed.')
    console.log(`- Successful confirmed orders created: ${createdSuccessOrders}`)
    console.log(`- Cancelled tickets created: ${createdCancelledTickets}`)
    console.log(`- Total demo orders created: ${createdOrders}`)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error('Seed failed:', error.message)
  process.exit(1)
})
