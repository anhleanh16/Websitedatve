import { useState, useEffect } from 'react'
import { reviewService } from '../../../services/reviewService'
import './comment-management.css'

export default function Comments() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [filterStatus, setFilterStatus] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  useEffect(() => {
    loadReviews()
  }, [page, filterStatus])

  const loadReviews = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await reviewService.getAllReviews(page, 20, filterStatus)
      setReviews(data.reviews || [])
      setTotalPages(Math.ceil(data.total / data.limit))
    } catch (err) {
      setError(err.message || 'Lỗi tải bình luận')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (reviewId) => {
    setActionLoading(prev => ({ ...prev, [reviewId]: 'approving' }))
    try {
      await reviewService.approveReview(reviewId)
      await loadReviews()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: null }))
    }
  }

  const handleReject = async (reviewId) => {
    setActionLoading(prev => ({ ...prev, [reviewId]: 'rejecting' }))
    try {
      await reviewService.rejectReview(reviewId)
      await loadReviews()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: null }))
    }
  }

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) return
    
    setActionLoading(prev => ({ ...prev, [reviewId]: 'deleting' }))
    try {
      await reviewService.deleteReview(reviewId)
      await loadReviews()
    } catch (err) {
      alert(err.message)
    } finally {
      setActionLoading(prev => ({ ...prev, [reviewId]: null }))
    }
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Chờ duyệt', color: '#f59e0b' },
      approved: { label: 'Đã duyệt', color: '#22c55e' },
      rejected: { label: 'Đã từ chối', color: '#ef4444' }
    }
    const statusInfo = statusMap[status] || { label: status, color: '#6b7280' }
    return <span className="status-badge" style={{ backgroundColor: statusInfo.color }}>{statusInfo.label}</span>
  }

  const getRatingStars = (rating) => {
    const stars = []
    const filledStars = Math.floor(rating)
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} style={{ color: i < filledStars ? '#fbbf24' : '#d1d5db' }}>★</span>
      )
    }
    return stars
  }

  return (
    <div className="admin-comments">
      <div className="comments-header">
        <h2>Quản lý đánh giá & bình luận</h2>
        <div className="filter-controls">
          <select 
            value={filterStatus || ''} 
            onChange={(e) => { setFilterStatus(e.target.value || null); setPage(1) }}
            className="filter-select"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="table-card">
        {loading ? (
          <div className="loading">Đang tải...</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">Chưa có đánh giá nào</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Người dùng</th>
                  <th>Phim</th>
                  <th>Đánh giá</th>
                  <th>Bình luận</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review, idx) => (
                  <tr key={review.review_id}>
                    <td>{(page - 1) * 20 + idx + 1}</td>
                    <td>
                      <strong>{review.username || 'Ẩn danh'}</strong>
                      <br />
                      <small>{review.email}</small>
                    </td>
                    <td>
                      <small>{review.movie_title || 'N/A'}</small>
                    </td>
                    <td>
                      <div className="rating-display">
                        {getRatingStars(review.rating)}
                        <span className="rating-num">{review.rating}/5</span>
                      </div>
                    </td>
                    <td>
                      <p className="comment-text">{review.comment || '(không có bình luận)'}</p>
                    </td>
                    <td>{getStatusBadge(review.status)}</td>
                    <td>
                      <small>{new Date(review.created_at).toLocaleDateString('vi-VN')}</small>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {review.status === 'pending' && (
                          <>
                            <button 
                              className="btn-approve"
                              onClick={() => handleApprove(review.review_id)}
                              disabled={actionLoading[review.review_id]}
                              title="Phê duyệt"
                            >
                              ✓
                            </button>
                            <button 
                              className="btn-reject"
                              onClick={() => handleReject(review.review_id)}
                              disabled={actionLoading[review.review_id]}
                              title="Từ chối"
                            >
                              ✕
                            </button>
                          </>
                        )}
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(review.review_id)}
                          disabled={actionLoading[review.review_id]}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Trước
                </button>
                <span className="page-info">Trang {page}/{totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
