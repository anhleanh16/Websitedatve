import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { blogService } from '../../user/services/blogService'
import './blog-management.css'

const BLOG_CATEGORIES = [
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
  { value: 'cinema', label: 'Quy định tại rạp' },
  { value: 'other', label: 'Khác' }
]

export default function BlogManagement() {
  const [blogs, setBlogs] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    slug: '',
    thumbnail: '',
    summary: '',
    content: '',
    category: 'other',
    tags: '',
    status: 'draft'
  })

  useEffect(() => {
    loadBlogs()
  }, [])

  const loadBlogs = async () => {
    try {
      setLoading(true)
      const data = await blogService.getAll()
      setBlogs(data.blogs || [])
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Lỗi tải blog')
    } finally {
      setLoading(false)
    }
  }

  const handleField = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !prev.slug ? { slug: value.toLowerCase().replace(/\s+/g, '-') } : {})
    }))
  }

  const handleSave = async () => {
    try {
      if (!form.title || !form.content) {
        setError('Tiêu đề và nội dung là bắt buộc')
        return
      }

      if (editingId) {
        await blogService.update(editingId, form)
      } else {
        await blogService.create(form)
      }

      setForm({ title: '', slug: '', thumbnail: '', summary: '', content: '', category: 'other', tags: '', status: 'draft' })
      setEditingId(null)
      setIsAdding(false)
      await loadBlogs()
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  const handleEdit = (blog) => {
    setForm({
      title: blog.title,
      slug: blog.slug,
      thumbnail: blog.thumbnail || '',
      summary: blog.summary || '',
      content: blog.content,
      category: blog.category,
      tags: blog.tags || '',
      status: blog.status
    })
    setEditingId(blog.blog_id)
    setIsAdding(true)
  }

  const handleDelete = async (blogId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa?')) return

    try {
      await blogService.delete(blogId)
      await loadBlogs()
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setForm({ title: '', slug: '', thumbnail: '', summary: '', content: '', category: 'other', tags: '', status: 'draft' })
    setEditingId(null)
    setIsAdding(false)
  }

  if (loading) {
    return <div className='blog-management'><p>Đang tải...</p></div>
  }

  return (
    <div className='blog-management'>
      <div className='blog-header'>
        <h1>Quản lý Blog</h1>
        {!isAdding && (
          <button className='btn-add' onClick={() => setIsAdding(true)}>
            <FaPlus /> Thêm Blog
          </button>
        )}
      </div>

      {error && <div className='error-message'>{error}</div>}

      {isAdding && (
        <div className='blog-form-section'>
          <h3>{editingId ? 'Chỉnh sửa Blog' : 'Thêm Blog Mới'}</h3>
          
          <div className='form-group'>
            <label>Tiêu đề *</label>
            <input
              type='text'
              value={form.title}
              onChange={(e) => handleField('title', e.target.value)}
              placeholder='Tiêu đề blog'
            />
          </div>

          <div className='form-row'>
            <div className='form-group'>
              <label>Slug</label>
              <input
                type='text'
                value={form.slug}
                onChange={(e) => handleField('slug', e.target.value)}
                placeholder='url-friendly-slug'
              />
            </div>

            <div className='form-group'>
              <label>Danh mục</label>
              <select value={form.category} onChange={(e) => handleField('category', e.target.value)}>
                {BLOG_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className='form-group'>
              <label>Trạng thái</label>
              <select value={form.status} onChange={(e) => handleField('status', e.target.value)}>
                <option value='draft'>Bản nháp</option>
                <option value='published'>Đã xuất bản</option>
                <option value='hidden'>Ẩn</option>
              </select>
            </div>
          </div>

          <div className='form-group'>
            <label>Thumbnail (URL)</label>
            <input
              type='text'
              value={form.thumbnail}
              onChange={(e) => handleField('thumbnail', e.target.value)}
              placeholder='https://...'
            />
          </div>

          <div className='form-group'>
            <label>Tóm tắt</label>
            <textarea
              value={form.summary}
              onChange={(e) => handleField('summary', e.target.value)}
              placeholder='Tóm tắt ngắn gọn'
              rows={3}
            />
          </div>

          <div className='form-group'>
            <label>Nội dung *</label>
            <CKEditor
              editor={ClassicEditor}
              data={form.content}
              onReady={(editor) => {
                editor.ui.getEditableElement().parentElement.insertBefore(
                  document.createElement('div'),
                  editor.ui.getEditableElement()
                )
              }}
              onChange={(event, editor) => {
                handleField('content', editor.getData())
              }}
              config={{
                toolbar: [
                  'paragraph', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', 'heading'
                ]
              }}
            />
          </div>

          <div className='form-group'>
            <label>Tags</label>
            <input
              type='text'
              value={form.tags}
              onChange={(e) => handleField('tags', e.target.value)}
              placeholder='tag1, tag2, tag3'
            />
          </div>

          <div className='form-actions'>
            <button className='btn-save' onClick={handleSave}>
              <FaCheck /> Lưu
            </button>
            <button className='btn-cancel' onClick={handleCancel}>
              <FaTimes /> Hủy
            </button>
          </div>
        </div>
      )}

      <div className='blog-table-section'>
        <h3>Danh sách Blog ({blogs.length})</h3>
        
        {blogs.length === 0 ? (
          <p className='empty-message'>Chưa có blog nào</p>
        ) : (
          <table className='blog-table'>
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Views</th>
                <th>Tác giả</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map(blog => (
                <tr key={blog.blog_id}>
                  <td className='blog-title'>{blog.title}</td>
                  <td>{BLOG_CATEGORIES.find(c => c.value === blog.category)?.label || blog.category}</td>
                  <td>
                    <span className={`status-badge ${blog.status}`}>
                      {blog.status === 'published' ? 'Xuất bản' : blog.status === 'draft' ? 'Bản nháp' : 'Ẩn'}
                    </span>
                  </td>
                  <td>{blog.views || 0}</td>
                  <td>{blog.author_name || '—'}</td>
                  <td>{new Date(blog.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className='blog-actions'>
                    <button className='btn-edit' onClick={() => handleEdit(blog)} title='Chỉnh sửa'>
                      <FaEdit />
                    </button>
                    <button className='btn-delete' onClick={() => handleDelete(blog.blog_id)} title='Xóa'>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
