import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa'
import { CKEditor } from '@ckeditor/ckeditor5-react'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic'
import { blogService } from '../../user/services/blogService'
import './blog-management.css'

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

const createInitialBlogForm = (defaultCategory = '') => ({
  title: '',
  slug: '',
  thumbnail: '',
  summary: '',
  content: '',
  category: defaultCategory,
  tags: '',
  status: 'draft'
})

const uploadPastedImage = async (file, editor) => {
  if (!file || !file.type?.startsWith('image/')) return

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : ''
  const apiBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
  const formData = new FormData()
  formData.append('upload', file)

  try {
    const response = await fetch(`${apiBase}/admin/upload/ckeditor-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || 'Không thể upload ảnh.')
    }

    const uploadedUrl = data?.url || data?.default || ''
    if (!uploadedUrl) {
      throw new Error('Không nhận được đường dẫn ảnh từ máy chủ.')
    }

    try {
      editor.execute('insertImage', { src: uploadedUrl, alt: 'Pasted image' })
    } catch (insertError) {
      console.warn('Insert image failed, fallback to HTML insertion', insertError)
      editor.setData(`${editor.getData()}<img src="${uploadedUrl}" alt="Pasted image" />`)
    }
  } catch (error) {
    console.error('Upload pasted image failed', error)
  }
}

const attachImagePasteHandler = (editor) => {
  if (!editor?.editing?.view?.document) return

  const viewDocument = editor.editing.view.document
  const onPaste = (event, data) => {
    const files = Array.from(data?.dataTransfer?.files || []).filter((file) => file?.type?.startsWith('image/'))
    if (!files.length) return

    event.preventDefault()
    files.forEach((file) => uploadPastedImage(file, editor))
  }

  viewDocument.on('paste', onPaste)
}

export default function BlogManagement() {
  const [blogs, setBlogs] = useState([])
  const [categories, setCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState(createInitialBlogForm(''))
  const [categoryForm, setCategoryForm] = useState({
    category_name: '',
    description: ''
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [blogData, categoryData] = await Promise.all([
        blogService.getAll(),
        blogService.getAdminCategories()
      ])

      const nextCategories = categoryData.categories || []
      setBlogs(blogData.blogs || [])
      setCategories(nextCategories)

      if (!form.category && nextCategories[0]?.category_name) {
        setForm((prev) => ({ ...prev, category: nextCategories[0].category_name }))
      }
      setError('')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Lỗi tải dữ liệu blog')
    } finally {
      setLoading(false)
    }
  }

  const loadBlogs = async () => {
    const data = await blogService.getAll()
    setBlogs(data.blogs || [])
  }

  const loadCategories = async () => {
    const data = await blogService.getAdminCategories()
    const nextCategories = data.categories || []
    setCategories(nextCategories)

    setForm((prev) => {
      if (prev.category) return prev
      return { ...prev, category: nextCategories[0]?.category_name || '' }
    })
  }

  const handleField = (key, value) => {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'title' && !prev.slug ? { slug: value.toLowerCase().replace(/\s+/g, '-') } : {})
    }))
  }

  const resetBlogForm = () => {
    setForm(createInitialBlogForm(categories[0]?.category_name || ''))
    setEditingId(null)
    setIsAdding(false)
  }

  const handleSave = async () => {
    try {
      setNotice('')
      if (categories.length === 0) {
        setError('Vui lòng thêm danh mục Blog trước khi tạo bài viết')
        return
      }

      if (!form.title || !form.content) {
        setError('Tiêu đề và nội dung là bắt buộc')
        return
      }

      if (!form.category) {
        setError('Vui lòng chọn danh mục blog')
        return
      }

      if (editingId) {
        await blogService.update(editingId, form)
      } else {
        await blogService.create(form)
      }

      resetBlogForm()
      await loadBlogs()
      setError('')
      setNotice(editingId ? 'Đã cập nhật blog thành công.' : 'Đã tạo blog mới thành công.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể lưu blog')
    }
  }

  const handleSaveCategory = async () => {
    try {
      setError('')
      setNotice('')

      const payload = {
        category_name: slugify(categoryForm.category_name),
        description: categoryForm.description.trim(),
      }

      if (!payload.category_name) {
        setError('Vui lòng nhập mã danh mục hợp lệ (chỉ a-z, 0-9, dấu gạch ngang)')
        return
      }

      if (!payload.description) {
        setError('Vui lòng nhập tên hiển thị danh mục')
        return
      }

      const normalizedPayload = {
        category_name: payload.category_name.replace(/-/g, '_'),
        description: payload.description,
      }

      if (editingCategoryId) {
        await blogService.updateCategory(editingCategoryId, normalizedPayload)
      } else {
        await blogService.createCategory(normalizedPayload)
      }

      setCategoryForm({ category_name: '', description: '' })
      setEditingCategoryId(null)
      await loadCategories()
      setNotice(editingCategoryId ? 'Đã cập nhật danh mục blog.' : 'Đã thêm danh mục blog.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể lưu danh mục blog')
    }
  }

  const handleEditCategory = (category) => {
    setCategoryForm({
      category_name: category.category_name || '',
      description: category.description || '',
    })
    setEditingCategoryId(category.category_id)
  }

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Bạn chắc chắn muốn xóa danh mục ${category.description || category.category_name}?`)) return

    try {
      setError('')
      setNotice('')
      await blogService.deleteCategory(category.category_id)
      await loadCategories()
      setNotice('Đã xóa danh mục blog.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể xóa danh mục blog')
    }
  }

  const cancelCategoryEdit = () => {
    setCategoryForm({ category_name: '', description: '' })
    setEditingCategoryId(null)
  }

  const handleEdit = (blog) => {
    setForm({
      title: blog.title,
      slug: blog.slug,
      thumbnail: blog.thumbnail || '',
      summary: blog.summary || '',
      content: blog.content,
      category: blog.category || categories[0]?.category_name || '',
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
      setNotice('Đã xóa blog thành công.')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Không thể xóa blog')
    }
  }

  const handleCancel = () => {
    resetBlogForm()
  }

  const getCategoryLabel = (value) => {
    const category = categories.find((item) => item.category_name === value)
    return category?.description || value
  }

  if (loading) {
    return <div className='blog-management'><p>Đang tải...</p></div>
  }

  return (
    <div className='blog-management'>
      <div className='blog-header'>
        <h1>Quản lý Blog</h1>
        <div className='blog-header-actions'>
          {!isAdding && (
            <button className='btn-add' onClick={() => setIsAdding(true)}>
              <FaPlus /> Thêm Blog
            </button>
          )}
        </div>
      </div>

      {error && <div className='error-message'>{error}</div>}
      {notice && <div className='success-message'>{notice}</div>}

      <div className='blog-table-section'>
        <h3>Quản lý danh mục Blog ({categories.length})</h3>

        <div className='form-row'>
          <div className='form-group'>
            <label>Mã danh mục (slug)</label>
            <input
              type='text'
              value={categoryForm.category_name}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, category_name: e.target.value }))}
              placeholder='vi_du: huong_dan_su_dung'
            />
          </div>
          <div className='form-group'>
            <label>Tên hiển thị</label>
            <input
              type='text'
              value={categoryForm.description}
              onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder='Ví dụ: Hướng dẫn sử dụng'
            />
          </div>
        </div>

        <div className='form-actions' style={{ marginTop: 0 }}>
          <button className='btn-save' onClick={handleSaveCategory}>
            <FaCheck /> {editingCategoryId ? 'Cập nhật danh mục' : 'Thêm danh mục'}
          </button>
          {editingCategoryId && (
            <button className='btn-cancel' onClick={cancelCategoryEdit}>
              <FaTimes /> Hủy sửa danh mục
            </button>
          )}
        </div>

        {categories.length === 0 ? (
          <p className='empty-message'>Chưa có danh mục Blog. Vui lòng thêm danh mục trước khi tạo bài.</p>
        ) : (
          <table className='blog-table'>
            <thead>
              <tr>
                <th>Mã danh mục</th>
                <th>Tên hiển thị</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.category_id}>
                  <td>{category.category_name}</td>
                  <td>{category.description || '—'}</td>
                  <td className='blog-actions'>
                    <button className='btn-edit' onClick={() => handleEditCategory(category)} title='Chỉnh sửa danh mục'>
                      <FaEdit />
                    </button>
                    <button className='btn-delete' onClick={() => handleDeleteCategory(category)} title='Xóa danh mục'>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_name}>
                    {cat.description || cat.category_name}
                  </option>
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
                attachImagePasteHandler(editor)
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
                  'heading', '|', 'bold', 'italic', 'underline', 'strikethrough', 'fontSize', 'fontColor', 'highlight', '|', 'alignment', '|', 'link', '|', 'bulletedList', 'numberedList', '|', 'blockQuote', 'code', '|', 'insertTable', '|', 'imageUpload'
                ],
                fontSize: {
                  options: [9, 11, 13, 16, 18, 24, 32]
                },
                alignment: {
                  options: ['left', 'center', 'right', 'justify']
                },
                table: {
                  contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells']
                }
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
                  <td>{getCategoryLabel(blog.category)}</td>
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
