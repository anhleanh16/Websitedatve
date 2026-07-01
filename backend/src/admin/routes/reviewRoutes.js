import express from 'express'
import { reviewController } from '../controllers/reviewController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin routes
router.get('/admin/reviews', authMiddleware, adminOnly, reviewController.getAllReviews)
router.put('/admin/reviews/:reviewId/approve', authMiddleware, adminOnly, reviewController.approveReview)
router.put('/admin/reviews/:reviewId/reject', authMiddleware, adminOnly, reviewController.rejectReview)
router.delete('/admin/reviews/:reviewId', authMiddleware, adminOnly, reviewController.deleteReview)

// User routes (public)
router.get('/movie/:movieId/reviews', reviewController.getMovieReviews)
router.get('/movie/:movieId/review-stats', reviewController.getMovieStats)
router.post('/reviews', authMiddleware, reviewController.createReview)

export default router
