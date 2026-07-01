import { BlogModel } from '../models/blogModel.js'

export const blogController = {
  // Get all blogs (admin)
  getAllBlogs: async (req, res) => {
    try {
      const blogs = await BlogModel.getAllBlogs()
      res.json({ success: true, blogs })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải danh sách blog' })
    }
  },

  // Create new blog (admin)
  createBlog: async (req, res) => {
    try {
      const { title, slug, thumbnail, summary, content, category, tags, status, authorId } = req.body
      
      if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' })
      }

      const result = await BlogModel.createBlog({
        authorId: authorId || req.user?.id,
        title,
        slug,
        thumbnail,
        summary,
        content,
        category,
        tags,
        status
      })

      res.status(201).json({ success: true, blog: result, message: 'Tạo blog thành công' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tạo blog' })
    }
  },

  // Update blog (admin)
  updateBlog: async (req, res) => {
    try {
      const { blogId } = req.params
      const { title, slug, thumbnail, summary, content, category, tags, status } = req.body

      if (!title || !content) {
        return res.status(400).json({ success: false, message: 'Tiêu đề và nội dung là bắt buộc' })
      }

      const result = await BlogModel.updateBlog(blogId, {
        title,
        slug,
        thumbnail,
        summary,
        content,
        category,
        tags,
        status
      })

      res.json({ success: true, blog: result, message: 'Cập nhật blog thành công' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi cập nhật blog' })
    }
  },

  // Delete blog (admin)
  deleteBlog: async (req, res) => {
    try {
      const { blogId } = req.params
      await BlogModel.deleteBlog(blogId)
      res.json({ success: true, message: 'Xóa blog thành công' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi xóa blog' })
    }
  },

  // Get published blogs (user)
  getPublished: async (req, res) => {
    try {
      console.log('blogController.getPublished called with query:', req.query)
      const page = parseInt(req.query.page) || 1
      const limit = 10
      const offset = (page - 1) * limit

      const [blogs, total] = await Promise.all([
        BlogModel.getPublishedBlogs(limit, offset),
        BlogModel.getTotalCount()
      ])

      console.log('Returning blogs:', blogs.length, 'total:', total)
      res.json({ success: true, blogs, total, page })
    } catch (error) {
      console.error('Error in getPublished:', error)
      res.status(500).json({ success: false, message: 'Lỗi tải blog' })
    }
  },

  // Get blog by slug (user)
  getBlogDetail: async (req, res) => {
    try {
      const { slug } = req.params
      const blog = await BlogModel.getBlogBySlug(slug)

      if (!blog) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy blog' })
      }

      await BlogModel.incrementViews(blog.blog_id)
      res.json({ success: true, blog })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải chi tiết blog' })
    }
  },

  // Get blogs by category (user)
  getByCategory: async (req, res) => {
    try {
      const { category } = req.params
      const blogs = await BlogModel.getBlogsByCategory(category)
      res.json({ success: true, blogs })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: 'Lỗi tải blog theo danh mục' })
    }
  }
}
