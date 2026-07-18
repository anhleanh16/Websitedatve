import { db } from '../../../config/db.js'

const normalizeCategoryName = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')

export class BlogModel {
  static async getAllCategories() {
    try {
      const [results] = await db.query(
        `SELECT category_id, category_name, description
         FROM Blog_Categories
         ORDER BY category_name ASC`,
      )
      return results || []
    } catch (error) {
      console.error('getAllCategories error:', error)
      throw error
    }
  }

  static async getPublicCategories() {
    try {
      const [results] = await db.query(
        `SELECT bc.category_id, bc.category_name, bc.description, COUNT(b.blog_id) AS total_blogs
         FROM Blog_Categories bc
         LEFT JOIN Blogs b ON b.category = bc.category_name AND b.status = 'published'
         GROUP BY bc.category_id, bc.category_name, bc.description
         ORDER BY bc.category_name ASC`,
      )
      return results || []
    } catch (error) {
      console.error('getPublicCategories error:', error)
      throw error
    }
  }

  static async categoryExists(categoryName) {
    try {
      const normalized = normalizeCategoryName(categoryName)
      if (!normalized) return false

      const [results] = await db.query(
        'SELECT category_id FROM Blog_Categories WHERE category_name = ? LIMIT 1',
        [normalized],
      )
      return Boolean(results?.[0])
    } catch (error) {
      console.error('categoryExists error:', error)
      throw error
    }
  }

  static async createCategory(data = {}) {
    const categoryName = normalizeCategoryName(data.category_name)
    const description = String(data.description || '').trim()

    if (!categoryName) {
      throw new Error('Mã danh mục không hợp lệ')
    }

    const exists = await this.categoryExists(categoryName)
    if (exists) {
      throw new Error('Danh mục đã tồn tại')
    }

    try {
      const [results] = await db.query(
        'INSERT INTO Blog_Categories (category_name, description) VALUES (?, ?)',
        [categoryName, description || null],
      )
      return {
        category_id: results.insertId,
        category_name: categoryName,
        description: description || null,
      }
    } catch (error) {
      console.error('createCategory error:', error)
      throw error
    }
  }

  static async updateCategory(categoryId, data = {}) {
    const categoryName = normalizeCategoryName(data.category_name)
    const description = String(data.description || '').trim()

    if (!categoryName) {
      throw new Error('Mã danh mục không hợp lệ')
    }

    try {
      const [duplicated] = await db.query(
        'SELECT category_id FROM Blog_Categories WHERE category_name = ? AND category_id != ? LIMIT 1',
        [categoryName, categoryId],
      )

      if (duplicated?.[0]) {
        throw new Error('Danh mục đã tồn tại')
      }

      const [[current]] = await db.query(
        'SELECT category_name FROM Blog_Categories WHERE category_id = ? LIMIT 1',
        [categoryId],
      )

      if (!current) {
        throw new Error('Không tìm thấy danh mục')
      }

      const previousCategoryName = current.category_name

      await db.query(
        'UPDATE Blog_Categories SET category_name = ?, description = ? WHERE category_id = ?',
        [categoryName, description || null, categoryId],
      )

      if (previousCategoryName !== categoryName) {
        await db.query(
          'UPDATE Blogs SET category = ? WHERE category = ?',
          [categoryName, previousCategoryName],
        )
      }

      return {
        category_id: Number(categoryId),
        category_name: categoryName,
        description: description || null,
      }
    } catch (error) {
      console.error('updateCategory error:', error)
      throw error
    }
  }

  static async deleteCategory(categoryId) {
    try {
      const [[row]] = await db.query(
        'SELECT category_name FROM Blog_Categories WHERE category_id = ? LIMIT 1',
        [categoryId],
      )

      if (!row) {
        throw new Error('Không tìm thấy danh mục')
      }

      const [inUse] = await db.query(
        'SELECT blog_id FROM Blogs WHERE category = ? LIMIT 1',
        [row.category_name],
      )

      if (inUse?.[0]) {
        throw new Error('Danh mục đang có bài viết, không thể xóa')
      }

      await db.query('DELETE FROM Blog_Categories WHERE category_id = ?', [categoryId])
      return { success: true }
    } catch (error) {
      console.error('deleteCategory error:', error)
      throw error
    }
  }

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
      const normalizedCategory = normalizeCategoryName(category)
      if (!normalizedCategory || !(await this.categoryExists(normalizedCategory))) {
        throw new Error('Danh mục blog không tồn tại')
      }

      const [results] = await db.query(
        `INSERT INTO Blogs (author_id, title, slug, thumbnail, summary, content, category, tags, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [authorId || null, title, slug || title.toLowerCase().replace(/\s+/g, '-'), thumbnail, summary, content, normalizedCategory, tags, status || 'draft']
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
      const normalizedCategory = normalizeCategoryName(category)
      if (!normalizedCategory || !(await this.categoryExists(normalizedCategory))) {
        throw new Error('Danh mục blog không tồn tại')
      }

      const [results] = await db.query(
        `UPDATE Blogs 
         SET title = ?, slug = ?, thumbnail = ?, summary = ?, content = ?, category = ?, tags = ?, status = ?, updated_at = NOW()
         WHERE blog_id = ?`,
        [title, slug || title.toLowerCase().replace(/\s+/g, '-'), thumbnail, summary, content, normalizedCategory, tags, status, blogId]
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
