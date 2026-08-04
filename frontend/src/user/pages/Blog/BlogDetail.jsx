import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FaCalendarAlt, FaClock, FaEye, FaTag } from 'react-icons/fa'
import { blogService } from '../../services/blogService'
import { toAbsoluteAssetUrl } from '../../../utils/api'
import './BlogDetail.css'

const estimateReadTime = (content = '') => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.ceil(words / 180))} phút đọc`
}

const normalizeAssetPath = (value = '') => {
  const text = String(value || '').trim()
  if (!text) return ''

  try {
    const parsed = new URL(text, window.location.origin)
    return decodeURIComponent(parsed.pathname).replace(/\\/g, '/').toLowerCase()
  } catch {
    return decodeURIComponent(text.split('?')[0].split('#')[0])
      .replace(/\\/g, '/')
      .toLowerCase()
  }
}

const removeThumbnailFromBody = (html, thumbnail) => {
  const content = String(html || '')
  if (!content || !thumbnail || typeof window === 'undefined') {
    return content
  }

  const normalizedThumbnail = normalizeAssetPath(thumbnail)
  if (!normalizedThumbnail) return content

  try {
    const parser = new window.DOMParser()
    const doc = parser.parseFromString(content, 'text/html')
    doc.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || ''
      if (normalizeAssetPath(src) === normalizedThumbnail) {
        img.remove()
      }
    })
    return doc.body.innerHTML
  } catch {
    return content
  }
}

export default function BlogDetail() {
  const { slug } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBlog()
  }, [slug])

  const loadBlog = async () => {
    try {
      setLoading(true)
      const data = await blogService.getBySlug(slug)
      setBlog(data.blog)
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }

  const blogContentHtml = useMemo(
    () => removeThumbnailFromBody(blog?.content || '', blog?.thumbnail || ''),
    [blog?.content, blog?.thumbnail],
  )

  if (loading) {
    return (
      <div className='blog-detail-page'>
        <div className='blog-detail-empty'>Đang tải bài viết...</div>
      </div>
    )
  }

  if (error || !blog) {
    return (
      <div className='blog-detail-page'>
        <div className='blog-detail-empty'>{error || 'Không tìm thấy bài viết'}</div>
      </div>
    )
  }

  return (
    <div className='blog-detail-page'>
      <div className='blog-detail-breadcrumb'>
        <Link to='/'>Trang chủ</Link>
        <span>›</span>
        <Link to='/blog'>Blog</Link>
        <span>›</span>
        <strong>{blog.title}</strong>
      </div>

      <article className='blog-detail-article'>
        <header className='blog-detail-header'>
          <div className='blog-detail-badges'>
            <span className='blog-detail-category'>
              <FaTag /> {blog.category}
            </span>
          </div>
          <h1>{blog.title}</h1>

          <div className='blog-detail-meta'>
            <span>
              <FaCalendarAlt /> {new Date(blog.created_at).toLocaleString('vi-VN')}
            </span>
            <span>
              <FaEye /> {blog.views || 0} lượt xem
            </span>
            <span>
              <FaClock /> {estimateReadTime(blog.content)}
            </span>
            {blog.author_name && <span>Tác giả: {blog.author_name}</span>}
          </div>
        </header>

        {blog.thumbnail && (
          <div className='blog-detail-cover-wrap'>
            <img
              className='blog-detail-cover'
              src={toAbsoluteAssetUrl(blog.thumbnail)}
              alt={blog.title}
            />
          </div>
        )}

        <div className='blog-detail-content' dangerouslySetInnerHTML={{ __html: blogContentHtml }} />
      </article>

      <div className='blog-detail-actions'>
        <Link to='/blog' className='btn-back-to-blog'>
          ← Quay lại danh sách blog
        </Link>
      </div>
    </div>
  )
}
