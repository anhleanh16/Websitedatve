import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const categories = [
  ['intro', 'Giới thiệu'],
  ['guide', 'Hướng dẫn sử dụng'],
  ['utility', 'Tiện ích online'],
  ['gift', 'Thẻ quà tặng'],
  ['recruitment', 'Tuyển dụng'],
  ['terms', 'Điều khoản sử dụng'],
  ['general', 'Điều khoản chung'],
  ['transaction', 'Điều khoản giao dịch'],
  ['privacy', 'Chính sách bảo mật'],
  ['payment', 'Chính sách thanh toán'],
  ['cinema', 'Quy định tại rạp'],
]

const buildContent = (label) =>
  `<h2>${label}</h2><p>Bài viết được tạo từ khu vực quản lý Blog để hiển thị ra trang người dùng.</p><p>Bạn có thể chỉnh sửa lại tiêu đề, nội dung và ảnh đại diện trong Admin.</p>`

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    for (const [name, label] of categories) {
      await connection.execute(
        'INSERT INTO Blog_Categories (category_name, description) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM Blog_Categories WHERE category_name = ?)',
        [name, label, name],
      )
    }

    let inserted = 0
    for (const [name, label] of categories) {
      const [existing] = await connection.execute(
        'SELECT blog_id FROM Blogs WHERE category = ? AND status = "published" LIMIT 1',
        [name],
      )

      if (!existing.length) {
        const stamp = Date.now()
        await connection.execute(
          'INSERT INTO Blogs (author_id, title, slug, thumbnail, summary, content, category, tags, status) VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, "published")',
          [
            `${label} - Cập nhật mới`,
            `${name}-cap-nhat-${stamp}-${Math.floor(Math.random() * 1000)}`,
            '',
            `Thông tin mới nhất thuộc danh mục ${label} tại Sweetstar Movie.`,
            buildContent(label),
            name,
            `${name},sweetstar`,
          ],
        )
        inserted += 1
      }
    }

    const [totalRows] = await connection.execute('SELECT COUNT(*) AS total FROM Blogs WHERE status = "published"')
    const total = totalRows?.[0]?.total || 0

    console.log(`Seed thành công. Bài published mới thêm: ${inserted}. Tổng bài published hiện có: ${total}.`)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error('Seed thất bại:', error)
  process.exit(1)
})
