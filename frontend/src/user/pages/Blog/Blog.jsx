import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaCalendarAlt, FaClock, FaEye, FaSearch, FaTag } from 'react-icons/fa'
import { blogService } from '../../services/blogService'
import { toAbsoluteAssetUrl } from '../../../utils/api'
import './Blog.css'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'intro', label: 'Giới thiệu' },
  { value: 'guide', label: 'Hướng dẫn sử dụng' },
  { value: 'utility', label: 'Tiện ích online' },
  { value: 'gift', label: 'Thẻ quà tặng' },
  { value: 'recruitment', label: 'Tuyển dụng' },
  { value: 'terms', label: 'Điều khoản sử dụng' },
  { value: 'general', label: 'Điều khoản chung' },
  { value: 'transaction', label: 'Điều khoản giao dịch' },
  { value: 'privacy', label: 'Chính sách bảo mật' },
  { value: 'payment', label: 'Chính sách thanh toán' },
  { value: 'cinema', label: 'Quy định tại rạp' }
]

const getCategoryLabel = (value) =>
  CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value

const estimateReadTime = (content = '') => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 180))} phút`
}

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalBlogs, setTotalBlogs] = useState(0)

  useEffect(() => {
    loadBlogs()
  }, [currentPage])

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl)
    }
  }, [searchParams])

  const loadBlogs = async () => {
    try {
      setLoading(true)
      const data = await blogService.getPublished(currentPage)
      setBlogs(data.blogs || [])
      setTotalBlogs(data.total || 0)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Lỗi tải blog')
    } finally {
      setLoading(false)
    }
  }

  const filteredBlogs = blogs.filter(blog => {
    const matchCat = activeCategory === 'all' || blog.category === activeCategory
    const matchSearch = !searchQuery.trim() || 
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.summary?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className='blog-user-page'>
      <div className='blog-breadcrumb'>
        <button className='back-btn' onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className='breadcrumb-items'>
          <Link to='/'>Trang chủ</Link>
          <span className='sep'>›</span>
          <span className='current'>Blog</span>
        </div>
      </div>

      <div className='blog-page-header'>
        <div className='blog-page-title-group'>
          <h1>Blog & Thông tin</h1>
          <p>Khám phá các bài viết về điều khoản, hướng dẫn và chính sách từ Sweetstar Movie.</p>
        </div>
        <div className='blog-search-box'>
          <FaSearch className='search-icon' />
          <input
            type='text'
            placeholder='Tìm kiếm bài viết...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label='Tìm kiếm bài viết'
          />
        </div>
      </div>

      <div className='blog-main'>
        <div className='blog-content'>
          <div className='blog-filter-bar'>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                className={`filter-btn ${activeCategory === cat.value ? 'active' : ''}`}
                onClick={() => {
                  setActiveCategory(cat.value)
                  if (cat.value === 'all') {
                    setSearchParams({})
                  } else {
                    setSearchParams({ category: cat.value })
                  }
                  setCurrentPage(1)
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className='blog-empty'>
              <span>📰</span>
              <p>Đang tải danh sách bài viết...</p>
            </div>
          ) : error ? (
            <div className='blog-empty'>
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          ) : filteredBlogs.length > 0 ? (
            <>
              <div className='blog-grid'>
                {filteredBlogs.map((blog) => (
                  <article key={blog.blog_id} className='blog-card'>
                    <div className='blog-card-img'>
                      {blog.thumbnail ? (
                        <img
                          className='blog-card-image'
                          src={toAbsoluteAssetUrl(blog.thumbnail)}
                          alt={blog.title}
                        />
                      ) : (
                        <div className='blog-card-img-placeholder'>📰</div>
                      )}
                      <span className='blog-cat-badge'>{getCategoryLabel(blog.category)}</span>
                    </div>
                    <div className='blog-card-body'>
                      <div className='blog-card-meta'>
                        <span>
                          <FaCalendarAlt /> {new Date(blog.created_at).toLocaleDateString('vi-VN')}
                        </span>
                        <span>
                          <FaClock /> {estimateReadTime(blog.content)}
                        </span>
                      </div>
                      <h3 className='blog-card-title'>{blog.title}</h3>
                      <div className='blog-card-excerpt' dangerouslySetInnerHTML={{ 
                        __html: blog.summary || blog.content.substring(0, 150) + '...' 
                      }} />
                      <div className='blog-card-footer'>
                        <span className='blog-views'>
                          <FaEye /> {blog.views || 0}
                        </span>
                        <Link className='btn-read-card' to={`/blog/${blog.slug}`}>
                          Đọc thêm
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className='blog-pagination'>
                <button 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ← Trước
                </button>
                <span className='page-info'>Trang {currentPage}</span>
                <button 
                  disabled={currentPage * 10 >= totalBlogs}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Sau →
                </button>
              </div>
            </>
          ) : (
            <div className='blog-empty'>
              <span>🔍</span>
              <p>Không tìm thấy bài viết phù hợp</p>
            </div>
          )}
        </div>

        <aside className='blog-sidebar'>
          <div className='sidebar-widget'>
            <div className='widget-header'>
              <span>📌</span>
              <h3>Danh mục</h3>
            </div>
            <div className='category-list'>
              {CATEGORY_OPTIONS.slice(1).map(cat => (
                <button
                  key={cat.value}
                  className={`category-link ${activeCategory === cat.value ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat.value)
                    setSearchParams({ category: cat.value })
                    setCurrentPage(1)
                  }}
                >
                  <FaTag /> {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
