import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FaCalendarAlt, FaClock, FaEye, FaSearch, FaTag } from 'react-icons/fa'
import { blogService } from '../../services/blogService'
import { toAbsoluteAssetUrl } from '../../../utils/api'
import './Blog.css'

const estimateReadTime = (content = '') => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 180))} phút`
}

const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|#160);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()

export default function Blog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [blogs, setBlogs] = useState([])
  const [categories, setCategories] = useState([{ value: 'all', label: 'Tất cả' }])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalBlogs, setTotalBlogs] = useState(0)

  useEffect(() => {
    loadBlogs()
  }, [currentPage, activeCategory])

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    const categoryFromUrl = searchParams.get('category')
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl)
    }
  }, [searchParams])

  const loadBlogs = async () => {
    try {
      setLoading(true)

      if (activeCategory !== 'all') {
        const data = await blogService.getByCategory(activeCategory)
        const categoryBlogs = data.blogs || []
        setBlogs(categoryBlogs)
        setTotalBlogs(categoryBlogs.length)
        setError('')
        return
      }

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

  const loadCategories = async () => {
    try {
      const data = await blogService.getCategoriesPublic()
      const normalized = (data.categories || []).map((item) => ({
        value: item.category_name,
        label: item.description || item.category_name,
      }))
      setCategories([{ value: 'all', label: 'Tất cả' }, ...normalized])
    } catch (err) {
      console.error(err)
      setCategories([{ value: 'all', label: 'Tất cả' }])
    }
  }

  const getCategoryLabel = (value) =>
    categories.find((item) => item.value === value)?.label || value

  const filteredBlogs = blogs.filter(blog => {
    const matchSearch = !searchQuery.trim() || 
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stripHtml(blog.summary || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchSearch
  })

  const handleCategoryChange = (value) => {
    setActiveCategory(value)
    if (value === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ category: value })
    }
    setCurrentPage(1)
  }

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
                      <p className='blog-card-excerpt'>
                        {stripHtml(blog.summary || blog.content).slice(0, 170) || 'Nội dung đang được cập nhật.'}
                        {stripHtml(blog.summary || blog.content).length > 170 ? '...' : ''}
                      </p>
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

              {activeCategory === 'all' && (
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
              )}
            </>
          ) : (
            <div className='blog-empty'>
              <span>🔍</span>
              <p>Chưa có bài viết trong danh mục này. Vui lòng chọn danh mục khác hoặc xem mục Tất cả.</p>
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
              {categories.map(cat => (
                <button
                  key={cat.value}
                  className={`category-link ${activeCategory === cat.value ? 'active' : ''}`}
                  onClick={() => handleCategoryChange(cat.value)}
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
