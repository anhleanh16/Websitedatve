import express from 'express'
import { reviewController } from '../controllers/reviewController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import { requireVerifiedEmail } from '../../user/middleware/requireVerifiedEmail.js'

const router = express.Router()

// Admin routes
router.get('/admin/reviews', authMiddleware, adminOnly, reviewController.getAllReviews)
router.put('/admin/reviews/:reviewId/approve', authMiddleware, adminOnly, reviewController.approveReview)
router.put('/admin/reviews/:reviewId/reject', authMiddleware, adminOnly, reviewController.rejectReview)
router.delete('/admin/reviews/:reviewId', authMiddleware, adminOnly, reviewController.deleteReview)

// User routes (public)
router.get('/movie/:movieId/reviews', reviewController.getMovieReviews)
router.get('/movie/:movieId/review-stats', reviewController.getMovieStats)
router.post('/reviews', authMiddleware, requireVerifiedEmail, reviewController.createReview)
router.put('/reviews/:reviewId', authMiddleware, requireVerifiedEmail, reviewController.updateReview)

export default router
