import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BLOG_MARKER = 'auto-seed-long-blog-2026'

const BLOG_CATEGORIES = [
  ['movie_experience', 'Trải nghiệm xem phim'],
  ['behind_the_screen', 'Hậu trường điện ảnh'],
  ['family_guide', 'Cẩm nang gia đình'],
  ['student_corner', 'Góc sinh viên'],
  ['popcorn_culture', 'Văn hóa rạp phim'],
  ['healthy_viewing', 'Xem phim lành mạnh'],
  ['smart_spending', 'Chi tiêu thông minh'],
  ['film_language', 'Ngôn ngữ điện ảnh'],
]

const BLOG_TOPICS = [
  'Hành trình xây dựng một buổi xem phim trọn vẹn từ lúc đặt vé đến khi ra về',
  'Bí quyết chọn suất chiếu cuối tuần mà vẫn thoải mái, không quá tải',
  'Nghệ thuật chọn ghế theo thể loại phim để cảm xúc đạt điểm rơi tốt nhất',
  'Cách đọc trailer thông minh để không bị lộ nội dung quan trọng',
  'Kinh nghiệm đi xem phim cùng trẻ em mà vẫn giữ được nhịp sinh hoạt',
  'Hướng dẫn tổ chức buổi xem phim nhóm đông tiết kiệm và hiệu quả',
  'Cách tối ưu ưu đãi thành viên để chi phí thấp nhưng trải nghiệm vẫn cao',
  'Thói quen chuẩn bị trước khi xem phim giúp tăng tập trung và cảm thụ',
  'Phương pháp đánh giá phim công bằng giữa cảm xúc và kỹ thuật',
  'Vì sao không gian rạp ảnh hưởng mạnh đến ấn tượng sau khi xem',
  'Cách kết hợp xem phim và hoạt động cuối tuần để không mệt mỏi',
  'Kinh nghiệm xem marathon nhiều phim mà vẫn giữ sự tỉnh táo',
  'Cách chọn combo bắp nước hợp lý theo thời lượng và khung giờ chiếu',
  'Cẩm nang lần đầu đưa người lớn tuổi đi rạp thật nhẹ nhàng',
  'Tư duy ghi chú sau khi xem phim để nhớ lâu và trao đổi sâu hơn',
  'Khai thác ưu đãi theo mùa để tối đa giá trị từng lần đặt vé',
  'Cách xem lại một bộ phim nhiều lần mà không nhàm chán',
  'Kinh nghiệm xử lý sự cố nhỏ khi đi rạp để không gián đoạn trải nghiệm',
  'Phân tích vai trò âm thanh trong việc nâng cảm xúc người xem',
  'Lộ trình xây dựng gu xem phim cá nhân trong 90 ngày',
]

const NEWS_ITEMS = [
  {
    title: 'Lunexa mở rộng khung giờ chiếu sớm cho nhóm khán giả đi làm',
    category: 'announcement',
    short: 'Bổ sung nhiều suất chiếu buổi sáng sớm tại các cụm rạp trung tâm để phù hợp lịch làm việc linh hoạt.',
  },
  {
    title: 'Tuần lễ phim châu Á: thêm 18 suất chiếu đặc biệt tại 5 cụm rạp',
    category: 'event',
    short: 'Chuỗi sự kiện giới thiệu phim châu Á đương đại, kèm phiên giao lưu ngắn sau một số suất chiếu.',
  },
  {
    title: 'Ưu đãi cặp đôi giữa tuần giảm đến 25% cho vé online',
    category: 'promotion',
    short: 'Khuyến mãi áp dụng từ thứ Ba đến thứ Năm cho các suất trước 20:00, số lượng có hạn theo từng rạp.',
  },
  {
    title: 'Cập nhật lịch phim mới tháng này với nhiều tác phẩm hành động',
    category: 'coming_soon',
    short: 'Danh sách phim sắp chiếu được bổ sung thêm nhiều lựa chọn hành động và phiêu lưu cho mùa cao điểm.',
  },
  {
    title: 'Bản tin phòng vé: xu hướng khán giả ưu tiên suất tối muộn',
    category: 'movie_news',
    short: 'Dữ liệu đặt vé cho thấy suất chiếu sau 21:00 tăng trưởng ổn định trong 6 tuần gần đây.',
  },
  {
    title: 'Đánh giá nhanh: nhóm phim gia đình dẫn đầu mức hài lòng',
    category: 'review',
    short: 'Điểm phản hồi nội bộ cho thấy phim gia đình có tỷ lệ khán giả quay lại cao nhất trong quý.',
  },
  {
    title: 'Lunexa nâng cấp quầy tự phục vụ tại sảnh rạp',
    category: 'announcement',
    short: 'Hệ thống kiosk mới giúp rút ngắn thời gian nhận vé và combo, giảm tải vào cuối tuần.',
  },
  {
    title: 'Sự kiện giao lưu đoàn phim độc quyền dành cho thành viên',
    category: 'event',
    short: 'Thành viên hạng cao có cơ hội tham dự buổi hỏi đáp với đoàn phim sau suất chiếu ra mắt.',
  },
  {
    title: 'Gói ưu đãi sinh viên mở lại trong khung giờ chiều',
    category: 'promotion',
    short: 'Ưu đãi sinh viên quay lại với nhiều lựa chọn ghế tiêu chuẩn và combo tối giản giá tốt.',
  },
  {
    title: 'Thống kê mới: lượng đặt vé trực tuyến tăng mạnh trên thiết bị di động',
    category: 'movie_news',
    short: 'Tỷ lệ giao dịch trên điện thoại tăng cao nhờ tối ưu tốc độ thanh toán và xác nhận vé tự động.',
  },
]

const slugify = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220)

const buildParagraph = (topic, sectionLabel, idx) => {
  const seed = idx + 1
  return [
    `Trong bối cảnh thói quen giải trí thay đổi nhanh, chủ đề \"${topic}\" không còn là một mẹo nhỏ, mà đã trở thành năng lực cần thiết để mỗi lần đến rạp đều đáng giá. ${sectionLabel} tập trung vào những bước rất cụ thể, dễ áp dụng ngay cả khi lịch cá nhân dày đặc.`,
    `Điểm quan trọng nhất là duy trì nhịp ra quyết định ổn định: chọn phim, chọn suất, chọn ghế và chuẩn bị thời gian di chuyển theo một quy trình lặp lại. Khi quy trình rõ ràng, bạn giảm được sai sót ở các bước nhỏ như chọn nhầm ngày, quên kiểm tra thời lượng hay đánh giá thiếu thực tế về mật độ giao thông trước giờ chiếu.`,
    `Một kinh nghiệm thực tế cho thấy, chỉ cần đặt ra 2 đến 3 tiêu chí cố định trước mỗi lần mua vé, mức độ hài lòng sau khi xem tăng đáng kể. Ví dụ, ưu tiên rạp gần tuyến đường quen thuộc, chọn suất cách giờ ăn tối ít nhất 45 phút, và luôn chừa khoảng đệm để không vào rạp trong trạng thái gấp gáp.`,
    `Ở góc độ dài hạn, việc chuẩn hóa thói quen này còn giúp bạn xây dựng dữ liệu cá nhân: bạn hợp định dạng phòng nào, thường thấy mỏi mắt ở vị trí nào, hay có xu hướng mất tập trung ở khung giờ nào. Từ dữ liệu đó, mỗi quyết định tiếp theo trở nên chính xác hơn, thay vì phụ thuộc hoàn toàn vào cảm hứng tức thời.`,
    `Khi áp dụng liên tục qua ${seed + 2} tuần, phần lớn người xem nhận thấy họ tiết kiệm được cả chi phí lẫn năng lượng tinh thần. Mục tiêu cuối cùng không phải là đi xem nhiều hơn, mà là mỗi lần xem đều trọn vẹn, có cảm xúc rõ ràng, và có giá trị chia sẻ với bạn bè hoặc gia đình sau khi phim kết thúc.`,
  ].join('</p><p>')
}

const buildLongBlogContent = (topic, categoryLabel) => {
  const sections = [
    '1. Bối cảnh và mục tiêu trải nghiệm',
    '2. Chuẩn bị trước khi đặt vé',
    '3. Ra quyết định chọn suất và ghế',
    '4. Tối ưu chi phí nhưng không giảm chất lượng',
    '5. Cân bằng thời gian cá nhân và lịch xem phim',
    '6. Xử lý tình huống phát sinh tại rạp',
    '7. Tổng kết sau suất chiếu để cải thiện lần sau',
    '8. Kế hoạch duy trì thói quen dài hạn',
  ]

  const blocks = sections
    .map((section, idx) => `<h2>${section}</h2><p>${buildParagraph(topic, section, idx)}</p>`)
    .join('')

  return `
    <h1>${topic}</h1>
    <p>Danh mục: <strong>${categoryLabel}</strong>. Bài viết chuyên sâu này được biên soạn để bạn có thể áp dụng từng bước trong thực tế, không chỉ đọc để tham khảo. Nội dung tập trung vào hành động cụ thể, ví dụ cụ thể và tiêu chí cụ thể.</p>
    ${blocks}
    <h2>Phần kết luận</h2>
    <p>Khi xem phim được chuẩn bị như một trải nghiệm có chủ đích, bạn sẽ nhận ra chất lượng giải trí tăng lên rõ rệt. Điều này không đòi hỏi thay đổi lớn, mà đến từ những điều chỉnh nhỏ nhưng thực hiện đều đặn. Hãy thử áp dụng ngay từ tuần này và ghi lại kết quả sau mỗi suất chiếu để tạo ra lộ trình phù hợp nhất với chính bạn.</p>
  `.trim()
}

const buildNewsContent = (title, shortDescription, category) => `
  <h2>${title}</h2>
  <p>${shortDescription}</p>
  <p>Bản tin thuộc nhóm <strong>${category}</strong>, tập trung vào các cập nhật mới nhất về vận hành, trải nghiệm người dùng và lịch chiếu tại hệ thống rạp Lunexa.</p>
  <p>Ngoài các thay đổi chính, đội ngũ vận hành cũng tiếp tục theo dõi phản hồi từ người dùng để tối ưu quy trình đặt vé, thanh toán, check-in và chăm sóc sau bán. Một số cải tiến sẽ được triển khai theo từng giai đoạn để đảm bảo tính ổn định và khả năng mở rộng.</p>
  <p>Người dùng có thể theo dõi thêm tại chuyên mục Tin tức để cập nhật các điều chỉnh mới nhất theo từng khu vực rạp, từng chương trình ưu đãi và từng giai đoạn phát hành phim.</p>
`.trim()

const ensureAuthorEmployeeId = async (connection) => {
  const [[employee]] = await connection.execute(
    'SELECT employee_id FROM Employees ORDER BY employee_id ASC LIMIT 1',
  )
  if (employee?.employee_id) return Number(employee.employee_id)

  const [[firstUser]] = await connection.execute('SELECT id FROM User ORDER BY id ASC LIMIT 1')
  if (!firstUser?.id) {
    throw new Error('Không tìm thấy User để tạo tác giả cho bảng news.')
  }

  const [insertEmployee] = await connection.execute(
    `INSERT INTO Employees (user_id, employee_code, position, hire_date, salary, status)
     VALUES (?, ?, 'Admin', CURDATE(), 0, 'active')`,
    [Number(firstUser.id), `AUTOSEED-${String(firstUser.id).padStart(4, '0')}`],
  )

  return Number(insertEmployee.insertId)
}

const run = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lunexa',
  })

  try {
    let categoryInserted = 0
    for (const [categoryName, description] of BLOG_CATEGORIES) {
      const [result] = await connection.execute(
        `INSERT INTO Blog_Categories (category_name, description)
         SELECT ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM Blog_Categories WHERE category_name = ?
         )`,
        [categoryName, description, categoryName],
      )
      if (Number(result.affectedRows || 0) > 0) categoryInserted += 1
    }

    let blogInserted = 0
    let blogSkipped = 0

    for (let i = 0; i < BLOG_TOPICS.length; i += 1) {
      const [categoryName, categoryLabel] = BLOG_CATEGORIES[i % BLOG_CATEGORIES.length]
      const topic = BLOG_TOPICS[i]
      const blogCode = String(i + 1).padStart(2, '0')
      const slug = `auto-long-blog-${blogCode}-${slugify(topic).slice(0, 70)}`

      const [[existingBlog]] = await connection.execute(
        'SELECT blog_id FROM Blogs WHERE slug = ? LIMIT 1',
        [slug],
      )

      if (existingBlog?.blog_id) {
        blogSkipped += 1
        continue
      }

      const summary = `Bài viết chuyên sâu: ${topic}. Nội dung dài, có cấu trúc theo từng phần để người đọc áp dụng thực tế.`
      const content = buildLongBlogContent(topic, categoryLabel)

      await connection.execute(
        `INSERT INTO Blogs
          (author_id, title, slug, thumbnail, summary, content, category, tags, status)
         VALUES (NULL, ?, ?, '', ?, ?, ?, ?, 'published')`,
        [
          topic,
          slug,
          summary,
          content,
          categoryName,
          `${categoryName},${BLOG_MARKER},longform`,
        ],
      )

      blogInserted += 1
    }

    const authorId = await ensureAuthorEmployeeId(connection)

    let newsInserted = 0
    let newsSkipped = 0

    for (let i = 0; i < NEWS_ITEMS.length; i += 1) {
      const item = NEWS_ITEMS[i]
      const newsCode = String(i + 1).padStart(2, '0')
      const slug = `auto-news-${newsCode}-${slugify(item.title).slice(0, 80)}`

      const [[existingNews]] = await connection.execute(
        'SELECT news_id FROM news WHERE slug = ? LIMIT 1',
        [slug],
      )

      if (existingNews?.news_id) {
        newsSkipped += 1
        continue
      }

      await connection.execute(
        `INSERT INTO news
          (title, slug, thumbnail, short_description, content, category, author_id, status, published_at)
         VALUES (?, ?, '', ?, ?, ?, ?, 'published', NOW())`,
        [
          item.title,
          slug,
          item.short,
          buildNewsContent(item.title, item.short, item.category),
          item.category,
          authorId,
        ],
      )

      newsInserted += 1
    }

    const [[blogCount]] = await connection.execute(
      `SELECT COUNT(*) AS total FROM Blogs WHERE tags LIKE ?`,
      [`%${BLOG_MARKER}%`],
    )
    const [[newsCount]] = await connection.execute(
      `SELECT COUNT(*) AS total FROM news WHERE slug LIKE 'auto-news-%'`,
    )

    console.log('Seed nội dung hoàn tất:')
    console.log(`- Danh mục blog thêm mới: ${categoryInserted}`)
    console.log(`- Blog dài đã thêm: ${blogInserted}, bỏ qua (đã có): ${blogSkipped}`)
    console.log(`- Tin tức đã thêm: ${newsInserted}, bỏ qua (đã có): ${newsSkipped}`)
    console.log(`- Tổng blog marker ${BLOG_MARKER}: ${blogCount?.total || 0}`)
    console.log(`- Tổng tin auto-news: ${newsCount?.total || 0}`)
  } finally {
    await connection.end()
  }
}

run().catch((error) => {
  console.error('Seed thất bại:', error)
  process.exit(1)
})
