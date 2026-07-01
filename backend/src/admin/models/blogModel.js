import { db } from '../../../config/db.js'

export class BlogModel {
  // Get all blogs (for admin)
  static async getAllBlogs() {
    try {
      const [results] = await db.query(
        `SELECT b.* FROM Blogs b ORDER BY b.created_at DESC`
      )
      return results || []
    } catch (error) {
      console.error('getAllBlogs error:', error)
      throw error
    }
  }

  // Get single blog by ID
  static async getBlogById(blogId) {
    try {
      const [results] = await db.query(
        'SELECT * FROM Blogs WHERE blog_id = ?',
        [blogId]
      )
      return results?.[0] || null
    } catch (error) {
      console.error('getBlogById error:', error)
      throw error
    }
  }

  // Create new blog
  static async createBlog(data) {
    const { authorId, title, slug, thumbnail, summary, content, category, tags, status } = data
    
    try {
      const [results] = await db.query(
        `INSERT INTO Blogs (author_id, title, slug, thumbnail, summary, content, category, tags, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [authorId || null, title, slug || title.toLowerCase().replace(/\s+/g, '-'), thumbnail, summary, content, category, tags, status || 'draft']
      )
      return { blog_id: results.insertId, ...data }
    } catch (error) {
      console.error('createBlog error:', error)
      throw error
    }
  }

  // Update blog
  static async updateBlog(blogId, data) {
    const { title, slug, thumbnail, summary, content, category, tags, status } = data
    
    try {
      const [results] = await db.query(
        `UPDATE Blogs 
         SET title = ?, slug = ?, thumbnail = ?, summary = ?, content = ?, category = ?, tags = ?, status = ?, updated_at = NOW()
         WHERE blog_id = ?`,
        [title, slug || title.toLowerCase().replace(/\s+/g, '-'), thumbnail, summary, content, category, tags, status, blogId]
      )
      return { blog_id: blogId, ...data }
    } catch (error) {
      console.error('updateBlog error:', error)
      throw error
    }
  }

  // Delete blog
  static async deleteBlog(blogId) {
    try {
      const [results] = await db.query(
        'DELETE FROM Blogs WHERE blog_id = ?',
        [blogId]
      )
      return { success: true }
    } catch (error) {
      console.error('deleteBlog error:', error)
      throw error
    }
  }

  // Get published blogs for user view
  static async getPublishedBlogs(limit = 10, offset = 0) {
    try {
      const [results] = await db.query(
        `SELECT b.* 
         FROM Blogs b 
         WHERE b.status = 'published'
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      )
      return results || []
    } catch (error) {
      console.error('getPublishedBlogs error:', error)
      throw error
    }
  }

  // Get published blog by slug
  static async getBlogBySlug(slug) {
    try {
      const [results] = await db.query(
        `SELECT b.* 
         FROM Blogs b 
         WHERE b.slug = ? AND b.status = 'published'`,
        [slug]
      )
      return results?.[0] || null
    } catch (error) {
      console.error('getBlogBySlug error:', error)
      throw error
    }
  }

  // Get blogs by category
  static async getBlogsByCategory(category) {
    try {
      const [results] = await db.query(
        `SELECT b.* 
         FROM Blogs b 
         WHERE b.category = ? AND b.status = 'published'
         ORDER BY b.created_at DESC`,
        [category]
      )
      return results || []
    } catch (error) {
      console.error('getBlogsByCategory error:', error)
      throw error
    }
  }

  // Increment view count
  static async incrementViews(blogId) {
    try {
      const [results] = await db.query(
        'UPDATE Blogs SET views = views + 1 WHERE blog_id = ?',
        [blogId]
      )
      return { success: true }
    } catch (error) {
      console.error('incrementViews error:', error)
      throw error
    }
  }

  // Get total published count
  static async getTotalCount() {
    try {
      const [results] = await db.query(
        'SELECT COUNT(*) as total FROM Blogs WHERE status = "published"'
      )
      return results?.[0]?.total || 0
    } catch (error) {
      console.error('getTotalCount error:', error)
      throw error
    }
  }
}
