const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"

export const blogService = {
  // Admin endpoints
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/blogs`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (!response.ok) throw new Error('Lỗi tải blog')
    return response.json()
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE_URL}/admin/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Lỗi tạo blog')
    return response.json()
  },

  update: async (blogId, data) => {
    const response = await fetch(`${API_BASE_URL}/admin/blogs/${blogId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Lỗi cập nhật blog')
    return response.json()
  },

  delete: async (blogId) => {
    const response = await fetch(`${API_BASE_URL}/admin/blogs/${blogId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (!response.ok) throw new Error('Lỗi xóa blog')
    return response.json()
  },

  // User endpoints
  getPublished: async (page = 1) => {
    const response = await fetch(`${API_BASE_URL}/blog?page=${page}`)
    if (!response.ok) throw new Error('Lỗi tải blog')
    return response.json()
  },

  getBySlug: async (slug) => {
    const response = await fetch(`${API_BASE_URL}/blog/${slug}`)
    if (!response.ok) throw new Error('Không tìm thấy blog')
    return response.json()
  },

  getByCategory: async (category) => {
    const response = await fetch(`${API_BASE_URL}/blog/category/${category}`)
    if (!response.ok) throw new Error('Lỗi tải blog theo danh mục')
    return response.json()
  }
}
