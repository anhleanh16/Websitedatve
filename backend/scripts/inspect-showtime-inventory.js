import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    const [movies] = await connection.query(
      `SELECT movie_id, title, status, duration, release_date FROM Movies WHERE is_deleted = 0 ORDER BY movie_id ASC`,
    )
    const [cinemas] = await connection.query(
      `SELECT cinemas_id, cinema_name, status FROM Cinemas ORDER BY cinemas_id ASC`,
    )
    const [rooms] = await connection.query(
      `SELECT room_id, cinema_id, room_name, room_type, total_seat, status FROM Rooms ORDER BY cinema_id ASC, room_id ASC`,
    )

    console.log(JSON.stringify({ movies, cinemas, rooms }, null, 2))
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
