import { ReviewModel } from '../models/reviewModel.js'
import { detectSensitiveWords } from '../services/profanityService.js'

export const reviewController = {
  // Get all reviews (admin)
  getAllReviews: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const status = req.query.status || null
      const movieId = req.query.movieId || null

      const filter = {}
      if (status) filter.status = status
      if (movieId) filter.movieId = movieId

      const [reviews, total] = await Promise.all([
        ReviewModel.getAllReviews(limit, offset, filter),
        ReviewModel.getTotalCount(filter)
      ])

      res.json({ success: true, reviews, total, page, limit })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải danh sách đánh giá' })
    }
  },

  // Get reviews for a movie (public)
  getMovieReviews: async (req, res) => {
    try {
      const { movieId } = req.params
      const page = parseInt(req.query.page) || 1
      const limit = 10
      const offset = (page - 1) * limit

      const reviews = await ReviewModel.getReviewsByMovie(movieId, limit, offset)

      res.json({ success: true, reviews })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải bình luận' })
    }
  },

  // Get review stats for movie
  getMovieStats: async (req, res) => {
    try {
      const { movieId } = req.params
      const stats = await ReviewModel.getMovieReviewStats(movieId)
      res.json({ success: true, stats })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải thống kê' })
    }
  },

  // Create review (user)
  createReview: async (req, res) => {
    try {
      const { movieId, rating, comment } = req.body
      const userId = req.userId
      const normalizedComment = String(comment || '').trim()

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Vui lòng đăng nhập' })
      }

      if (!movieId || !rating) {
        return res.status(400).json({ success: false, message: 'Điểm đánh giá và ID phim là bắt buộc' })
      }

      const numericRating = parseFloat(rating)
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Điểm đánh giá phải từ 1 đến 5' })
      }

      if (normalizedComment.length > 500) {
        return res.status(400).json({ success: false, message: 'Bình luận tối đa 500 ký tự' })
      }

      const moderation = detectSensitiveWords(normalizedComment)
      if (moderation.blocked) {
        return res.status(400).json({
          success: false,
          message: 'Bình luận chứa từ ngữ nhạy cảm. Vui lòng chỉnh sửa nội dung trước khi gửi.',
        })
      }

      // Check if user already reviewed
      const hasReview = await ReviewModel.userHasReview(movieId, userId)
      if (hasReview) {
        return res.status(400).json({ success: false, message: 'Bạn đã đánh giá phim này rồi' })
      }

      const review = await ReviewModel.createReview({
        movieId,
        userId,
        rating: numericRating,
        comment: normalizedComment,
        status: 'approved'
      })

      res.status(201).json({ success: true, review, message: 'Đánh giá của bạn đã được đăng' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tạo đánh giá' })
    }
  },

  // Approve review (admin)
  approveReview: async (req, res) => {
    try {
      const { reviewId } = req.params

      await ReviewModel.updateReviewStatus(reviewId, 'approved')

      res.json({ success: true, message: 'Đánh giá đã được phê duyệt' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi phê duyệt đánh giá' })
    }
  },

  // Reject review (admin)
  rejectReview: async (req, res) => {
    try {
      const { reviewId } = req.params

      await ReviewModel.updateReviewStatus(reviewId, 'rejected')

      res.json({ success: true, message: 'Đánh giá đã bị từ chối' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi từ chối đánh giá' })
    }
  },

  // Delete review (admin)
  deleteReview: async (req, res) => {
    try {
      const { reviewId } = req.params

      await ReviewModel.deleteReview(reviewId)

      res.json({ success: true, message: 'Đánh giá đã được xóa' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi xóa đánh giá' })
    }
  }
}
