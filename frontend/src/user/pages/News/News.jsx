import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FaSearch, FaCalendarAlt, FaEye, FaHeart, FaShareAlt, FaTag, FaFire, FaClock } from 'react-icons/fa'
import './News.css'

/* ── Mock data ── */
const FEATURED = {
  id: 1,
  category: 'Điện ảnh',
  tag: 'NỔI BẬT',
  title: 'Avengers: Secret Wars – Siêu phẩm Marvel được mong chờ nhất 2026',
  excerpt:
    'Marvel Studios chính thức xác nhận ngày khởi chiếu toàn cầu cho Avengers: Secret Wars vào tháng 12 năm nay. Đây được xem là bom tấn có quy mô lớn nhất từ trước đến nay của MCU với sự góp mặt của hơn 60 siêu anh hùng.',
  author: 'Minh Anh',
  date: '08/06/2026',
  views: '128.4k',
  likes: '9.2k',
  readTime: '5 phút',
  gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #0f172a 100%)',
  accent: '#fca5a5',
}

const CATEGORIES = ['Tất cả', 'Điện ảnh', 'Rạp chiếu', 'Sự kiện', 'Ưu đãi', 'Nhân vật']

const NEWS = [
  {
    id: 2,
    category: 'Sự kiện',
    title: 'Lunexa tổ chức đêm chiếu phim đặc biệt nhân dịp khai trương rạp mới',
    excerpt: 'Sự kiện chiếu phim miễn phí với hơn 500 ghế dành cho khách mời đặc biệt tại cơ sở Đà Nẵng mới khai trương.',
    date: '07/06/2026',
    views: '34.1k',
    likes: '2.8k',
    readTime: '3 phút',
    hot: true,
  },
  {
    id: 3,
    category: 'Ưu đãi',
    title: 'Mùa hè 2026: Hàng loạt ưu đãi vé xem phim dành cho học sinh, sinh viên',
    excerpt: 'Chương trình "Hè Xanh" giảm đến 40% giá vé tất cả suất chiếu buổi sáng trong tháng 6 và 7.',
    date: '06/06/2026',
    views: '52.7k',
    likes: '4.1k',
    readTime: '4 phút',
    hot: true,
  },
  {
    id: 4,
    category: 'Điện ảnh',
    title: 'Inside Out 3 chính thức phá kỷ lục doanh thu phim hoạt hình tại Việt Nam',
    excerpt: 'Chỉ sau 2 tuần công chiếu, bộ phim của Pixar đã thu về hơn 120 tỷ đồng và vẫn chưa có dấu hiệu dừng lại.',
    date: '05/06/2026',
    views: '87.3k',
    likes: '6.5k',
    readTime: '5 phút',
    hot: false,
  },
  {
    id: 5,
    category: 'Nhân vật',
    title: 'Phỏng vấn độc quyền: Đạo diễn người Việt chia sẻ về dự án phim bom tấn quốc tế',
    excerpt: 'Đạo diễn Trần Thanh Huy tiết lộ những bí mật hậu trường của siêu phẩm điện ảnh đang được Hollywood chú ý.',
    date: '04/06/2026',
    views: '29.6k',
    likes: '1.9k',
    readTime: '8 phút',
    hot: false,
  },
  {
    id: 6,
    category: 'Rạp chiếu',
    title: 'Lunexa ra mắt phòng chiếu 4DX đầu tiên tại miền Trung Việt Nam',
    excerpt: 'Công nghệ 4DX với ghế chuyển động, mưa, gió và các hiệu ứng đặc biệt mang lại trải nghiệm điện ảnh hoàn toàn mới.',
    date: '03/06/2026',
    views: '45.2k',
    likes: '3.7k',
    readTime: '4 phút',
    hot: false,
  },
  {
    id: 7,
    category: 'Điện ảnh',
    title: 'Top 10 phim được mong chờ nhất nửa cuối năm 2026',
    excerpt: 'Từ siêu anh hùng đến kinh dị, đây là danh sách những bộ phim không thể bỏ qua trong những tháng cuối năm.',
    date: '02/06/2026',
    views: '71.8k',
    likes: '5.3k',
    readTime: '6 phút',
    hot: false,
  },
]

const TRENDING = [
  { id: 8, title: 'Doraemon: Cuộc Chiến Vũ Trụ Tí Hon đạt 200 tỷ doanh thu', views: '98k' },
  { id: 9, title: 'Rạp Lunexa mở thêm 3 chi nhánh mới trong năm 2026', views: '67k' },
  { id: 10, title: 'Ưu đãi Thành viên Gold tháng 6 – Giảm 20% tất cả vé', views: '54k' },
  { id: 11, title: 'Marvel tiết lộ kế hoạch Phase 7 với 12 siêu phẩm mới', views: '43k' },
  { id: 12, title: 'Phim Việt Nam đầu tiên tranh giải Oscar 2027', views: '38k' },
]

export default function News() {
  const [activeCategory, setActiveCategory] = useState('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [likedIds, setLikedIds] = useState(new Set())

  const filtered = NEWS.filter((n) => {
    const matchCat = activeCategory === 'Tất cả' || n.category === activeCategory
    const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  const toggleLike = (id) => {
    setLikedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="news-page">
      {/* ── Breadcrumb ── */}
      <div className="news-breadcrumb">
        <button className="back-btn" onClick={() => window.history.back()}>← Quay lại</button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="sep">›</span>
          <span className="current">Tin tức</span>
        </div>
      </div>

      {/* ── Page header ── */}
      <div className="news-page-header">
        <div className="news-page-title-group">
          <h1>Tin tức & Sự kiện</h1>
          <p>Cập nhật thông tin điện ảnh, ưu đãi và sự kiện mới nhất</p>
        </div>
        <div className="news-search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm tin tức..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm tin tức"
          />
        </div>
      </div>

      {/* ── Featured ── */}
      <section
        className="news-featured"
        style={{ background: FEATURED.gradient }}
      >
        <div className="featured-body">
          <div className="featured-left">
            <div className="featured-chips">
              <span className="featured-tag" style={{ color: FEATURED.accent, borderColor: FEATURED.accent + '60' }}>
                <FaFire /> {FEATURED.tag}
              </span>
              <span className="featured-cat">{FEATURED.category}</span>
            </div>
            <h2 className="featured-title">{FEATURED.title}</h2>
            <p className="featured-excerpt">{FEATURED.excerpt}</p>
            <div className="featured-meta">
              <span><FaCalendarAlt /> {FEATURED.date}</span>
              <span><FaEye /> {FEATURED.views}</span>
              <span><FaHeart /> {FEATURED.likes}</span>
              <span><FaClock /> {FEATURED.readTime} đọc</span>
            </div>
            <div className="featured-actions">
              <button className="btn-read-more" style={{ background: FEATURED.accent, color: '#0f172a' }}>
                Đọc ngay →
              </button>
              <button className="btn-share">
                <FaShareAlt /> Chia sẻ
              </button>
            </div>
          </div>
          <div className="featured-right">
            <div className="featured-img-placeholder">
              <span>🎬</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main content ── */}
      <div className="news-main">
        {/* ── Left: article list ── */}
        <div className="news-content">
          {/* Category filter */}
          <div className="news-filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Articles grid */}
          {filtered.length > 0 ? (
            <div className="news-grid">
              {filtered.map((item) => (
                <article key={item.id} className="news-card">
                  <div className="news-card-img">
                    <div className="news-card-img-placeholder">📰</div>
                    {item.hot && (
                      <span className="news-hot-badge">
                        <FaFire /> HOT
                      </span>
                    )}
                    <span className="news-cat-badge">{item.category}</span>
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span><FaCalendarAlt /> {item.date}</span>
                      <span><FaClock /> {item.readTime}</span>
                    </div>
                    <h3 className="news-card-title">{item.title}</h3>
                    <p className="news-card-excerpt">{item.excerpt}</p>
                    <div className="news-card-footer">
                      <div className="news-card-stats">
                        <span><FaEye /> {item.views}</span>
                        <button
                          className={`like-btn ${likedIds.has(item.id) ? 'liked' : ''}`}
                          onClick={() => toggleLike(item.id)}
                          aria-label="Thích"
                        >
                          <FaHeart /> {item.likes}
                        </button>
                      </div>
                      <button className="btn-read-card">Đọc thêm</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="news-empty">
              <span>🔍</span>
              <p>Không tìm thấy tin tức phù hợp</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="news-load-more">
              <button className="btn-load-more">Xem thêm tin tức</button>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <aside className="news-sidebar">
          {/* Trending */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <FaFire style={{ color: '#f97316' }} />
              <h3>Xu hướng</h3>
            </div>
            <ol className="trending-list">
              {TRENDING.map((item, idx) => (
                <li key={item.id} className="trending-item">
                  <span className={`trending-num ${idx < 3 ? 'top' : ''}`}>{idx + 1}</span>
                  <div className="trending-body">
                    <span className="trending-title">{item.title}</span>
                    <span className="trending-views"><FaEye /> {item.views}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Tags */}
          <div className="sidebar-widget">
            <div className="widget-header">
              <FaTag style={{ color: '#818cf8' }} />
              <h3>Chủ đề phổ biến</h3>
            </div>
            <div className="tag-cloud">
              {['Marvel', 'Pixar', 'Disney', 'Phim Việt', 'IMAX', '4DX', 'Bom tấn', 'Ưu đãi', 'Sự kiện', 'Hoạt hình', 'Kinh dị'].map((tag) => (
                <button key={tag} className="tag-chip">{tag}</button>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="sidebar-widget newsletter-widget">
            <div className="widget-header">
              <span>📬</span>
              <h3>Nhận tin mới nhất</h3>
            </div>
            <p className="newsletter-desc">Đăng ký để nhận thông báo về phim, ưu đãi và sự kiện mỗi tuần.</p>
            <div className="newsletter-form">
              <input type="email" placeholder="Email của bạn" aria-label="Email đăng ký nhận tin" />
              <button className="newsletter-btn">Đăng ký</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
