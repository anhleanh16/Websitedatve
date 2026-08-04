import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const DEFAULT_CATEGORIES = [
  'intro',
  'guide',
  'utility',
  'gift',
  'recruitment',
  'terms',
  'general',
  'transaction',
  'privacy',
  'payment',
  'cinema',
]

const TITLES = [
  'Kinh nghiệm đặt vé nhanh vào cuối tuần',
  'Bí kíp chọn ghế đẹp cho từng phòng chiếu',
  'Hướng dẫn sử dụng ưu đãi thành viên',
  'Mẹo tối ưu điểm tích lũy khi mua vé',
  'Cách đặt combo bắp nước tiết kiệm hơn',
  'Lịch phát hành phim đáng chú ý tháng này',
  'Hướng dẫn thanh toán an toàn trên hệ thống',
  'Quy trình đổi lịch khi suất chiếu thay đổi',
  'Kinh nghiệm đi xem phim cùng gia đình',
  'Tổng hợp ưu đãi mới nhất tại rạp',
]

const makeSlug = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

const buildContent = (title, categoryLabel) => `
  <h2>${title}</h2>
  <p>Đây là bài viết mẫu được tạo tự động để bổ sung dữ liệu blog cho trang người dùng.</p>
  <p>Nội dung thuộc danh mục <strong>${categoryLabel}</strong>, bạn có thể vào Admin để chỉnh sửa tiêu đề, nội dung và ảnh banner.</p>
  <ul>
    <li>Thông tin cập nhật theo vận hành rạp</li>
    <li>Hướng dẫn rõ ràng, dễ áp dụng</li>
    <li>Trình bày thân thiện cho người đọc</li>
  </ul>
`.trim()

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    await connection.execute('DELETE FROM Blogs WHERE tags LIKE "%auto-seed%"')

    const [categoryRows] = await connection.execute(
      'SELECT category_name, description FROM Blog_Categories ORDER BY category_id ASC',
    )

    const categories = categoryRows.length
      ? categoryRows.map((row) => ({
          name: row.category_name,
          label: row.description || row.category_name,
        }))
      : DEFAULT_CATEGORIES.map((name) => ({ name, label: name }))

    const stamp = Date.now()
    for (let i = 0; i < 10; i += 1) {
      const cat = categories[i % categories.length]
      const baseTitle = TITLES[i % TITLES.length]
      const title = `${baseTitle} #${i + 1}`
      const slug = `${makeSlug(baseTitle)}-${stamp}-${i + 1}`
      const summary = `Tóm tắt nhanh: ${baseTitle.toLowerCase()} (${cat.label}).`

      await connection.execute(
        `INSERT INTO Blogs
          (author_id, title, slug, thumbnail, summary, content, category, tags, status)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, 'published')`,
        [
          title,
          slug,
          '',
          summary,
          buildContent(title, cat.label),
          cat.name,
          `${cat.name},sweetstar,auto-seed`,
        ],
      )
    }

    const [countRows] = await connection.execute('SELECT COUNT(*) AS total FROM Blogs')
    const [publishedRows] = await connection.execute(
      'SELECT COUNT(*) AS total FROM Blogs WHERE status = "published"',
    )

    console.log('Đã thêm thành công 10 bài blog mới (tiếng Việt có dấu).')
    console.log('Tổng số blog:', countRows?.[0]?.total || 0)
    console.log('Tổng blog published:', publishedRows?.[0]?.total || 0)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error('Seed thất bại:', error)
  process.exit(1)
})
