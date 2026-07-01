import express from 'express'
import { blogController } from '../controllers/blogController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin routes
router.get('/admin/blogs', authMiddleware, adminOnly, blogController.getAllBlogs)
router.post('/admin/blogs', authMiddleware, adminOnly, blogController.createBlog)
router.put('/admin/blogs/:blogId', authMiddleware, adminOnly, blogController.updateBlog)
router.delete('/admin/blogs/:blogId', authMiddleware, adminOnly, blogController.deleteBlog)

// User routes
router.get('/blog', blogController.getPublished)
router.get('/blog/:slug', blogController.getBlogDetail)
router.get('/blog/category/:category', blogController.getByCategory)

export default router
