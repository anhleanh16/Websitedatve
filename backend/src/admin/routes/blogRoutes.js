import express from 'express'
import { blogController } from '../controllers/blogController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'

const router = express.Router()

// Admin routes
router.get('/admin/blog-categories', authMiddleware, adminOnly, blogController.getAdminCategories)
router.post('/admin/blog-categories', authMiddleware, adminOnly, blogController.createCategory)
router.put('/admin/blog-categories/:categoryId', authMiddleware, adminOnly, blogController.updateCategory)
router.delete('/admin/blog-categories/:categoryId', authMiddleware, adminOnly, blogController.deleteCategory)

router.get('/admin/blogs', authMiddleware, adminOnly, blogController.getAllBlogs)
router.post('/admin/blogs', authMiddleware, adminOnly, blogController.createBlog)
router.put('/admin/blogs/:blogId', authMiddleware, adminOnly, blogController.updateBlog)
router.delete('/admin/blogs/:blogId', authMiddleware, adminOnly, blogController.deleteBlog)

// User routes
router.get('/blog', blogController.getPublished)
router.get('/blog/categories', blogController.getPublicCategories)
router.get('/blog/category/:category', blogController.getByCategory)
router.get('/blog/:slug', blogController.getBlogDetail)

export default router
