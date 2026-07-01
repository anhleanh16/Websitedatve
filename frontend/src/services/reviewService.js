const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Helper to get auth headers with token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const reviewService = {
  // Get reviews for a movie
  getMovieReviews: async (movieId, page = 1) => {
    const res = await fetch(`${API_BASE_URL}/movie/${movieId}/reviews?page=${page}`)
    if (!res.ok) throw new Error('Lỗi tải bình luận')
    return res.json()
  },

  // Get review stats for a movie
  getMovieStats: async (movieId) => {
    const res = await fetch(`${API_BASE_URL}/movie/${movieId}/review-stats`)
    if (!res.ok) throw new Error('Lỗi tải thống kê')
    return res.json()
  },

  // Create a review (requires authentication)
  createReview: async (movieId, rating, comment) => {
    const res = await fetch(`${API_BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      credentials: 'include',
      body: JSON.stringify({ movieId, rating, comment })
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message || 'Lỗi tạo đánh giá')
    }
    return res.json()
  },

  // Get all reviews (admin)
  getAllReviews: async (page = 1, limit = 20, status = null, movieId = null) => {
    let url = `${API_BASE_URL}/admin/reviews?page=${page}&limit=${limit}`
    if (status) url += `&status=${status}`
    if (movieId) url += `&movieId=${movieId}`

    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Lỗi tải danh sách đánh giá')
    return res.json()
  },

  // Approve a review (admin)
  approveReview: async (reviewId) => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/approve`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Lỗi phê duyệt đánh giá')
    return res.json()
  },

  // Reject a review (admin)
  rejectReview: async (reviewId) => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}/reject`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Lỗi từ chối đánh giá')
    return res.json()
  },

  // Delete a review (admin)
  deleteReview: async (reviewId) => {
    const res = await fetch(`${API_BASE_URL}/admin/reviews/${reviewId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    })
    if (!res.ok) throw new Error('Lỗi xóa đánh giá')
    return res.json()
  }
}
