import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { reviewService } from '../../services/reviewService'
import { FaStar } from 'react-icons/fa'
import './ReviewSection.css'

export default function ReviewSection({ movieId }) {
  const user = useSelector(state => state.user.profile)
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadReviews()
    loadStats()
  }, [movieId])

  const loadReviews = async () => {
    setLoading(true)
    try {
      const data = await reviewService.getMovieReviews(movieId)
      setReviews(data.reviews || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await reviewService.getMovieStats(movieId)
      setStats(data.stats || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) {
      setError('Vui lòng đăng nhập để bình luận')
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      await reviewService.createReview(movieId, rating, comment)
      setSuccess('Đánh giá của bạn đã được gửi và chờ phê duyệt')
      setRating(5)
      setComment('')
      setShowForm(false)
      setTimeout(() => loadReviews(), 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ value, onChange, interactive = false }) => (
    <div className="star-rating-input">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= value ? 'filled' : ''}`}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && onChange?.(star)}
        >
          <FaStar />
        </button>
      ))}
      {interactive && <span className="rating-text">{value}/5</span>}
    </div>
  )

  const getRatingBreakdown = () => {
    if (!stats || stats.length === 0) return null

    const breakdown = {}
    for (let i = 5; i >= 1; i--) {
      breakdown[i] = 0
    }

    let totalReviews = 0
    stats.forEach(stat => {
      const rating = Math.floor(stat.rating_floor)
      breakdown[rating] = stat.count_at_rating
      totalReviews += stat.count_at_rating
    })

    return { breakdown, totalReviews }
  }

  const avgRating = stats && stats.length > 0
    ? (stats.reduce((sum, s) => sum + (parseFloat(s.avg_rating) || 0), 0) / stats.length).toFixed(1)
    : 0

  const ratingData = getRatingBreakdown()

  return (
    <section className="review-section">
      <h2 className="review-title">Đánh giá & Bình luận</h2>

      {/* Rating Summary */}
      {ratingData && ratingData.totalReviews > 0 && (
        <div className="rating-summary">
          <div className="rating-avg">
            <div className="avg-number">{avgRating}</div>
            <div className="avg-stars">
              {[...Array(5)].map((_, i) => (
                <FaStar key={i} style={{ color: i < Math.floor(avgRating) ? '#fbbf24' : '#d1d5db' }} />
              ))}
            </div>
            <div className="avg-count">{ratingData.totalReviews} đánh giá</div>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="breakdown-row">
                <span className="breakdown-label">{rating} ⭐</span>
                <div className="breakdown-bar">
                  <div
                    className="breakdown-fill"
                    style={{
                      width: `${ratingData.totalReviews > 0 ? (ratingData.breakdown[rating] / ratingData.totalReviews) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="breakdown-count">{ratingData.breakdown[rating]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Form */}
      {!showForm ? (
        <button className="btn-write-review" onClick={() => setShowForm(true)}>
          ⭐ Viết đánh giá của bạn
        </button>
      ) : (
        <form className="review-form" onSubmit={handleSubmit}>
          <h3>Viết đánh giá</h3>

          <div className="form-group">
            <label>Đánh giá của bạn</label>
            <StarRating value={rating} onChange={setRating} interactive={true} />
          </div>

          <div className="form-group">
            <label htmlFor="comment">Bình luận (tùy chọn)</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn về bộ phim này..."
              maxLength={500}
              rows={4}
            />
            <small>{comment.length}/500</small>
          </div>

          {error && <div className="error-box">{error}</div>}
          {success && <div className="success-box">{success}</div>}

          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => setShowForm(false)}>
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="reviews-list">
        <h3>Các đánh giá ({reviews.length})</h3>

        {loading ? (
          <div className="loading-reviews">Đang tải đánh giá...</div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews">Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
        ) : (
          reviews.map(review => (
            <div key={review.review_id} className="review-item">
              <div className="review-header">
                <div className="review-author">
                  <strong>{review.username || 'Ẩn danh'}</strong>
                  <div className="review-rating">
                    {[...Array(5)].map((_, i) => (
                      <FaStar
                        key={i}
                        style={{ color: i < Math.floor(review.rating) ? '#fbbf24' : '#d1d5db' }}
                      />
                    ))}
                    <span>{review.rating}/5</span>
                  </div>
                </div>
                <span className="review-date">
                  {new Date(review.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
              {review.comment && <p className="review-comment">{review.comment}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
