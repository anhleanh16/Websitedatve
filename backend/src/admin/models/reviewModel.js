import { db } from '../../../config/db.js'

export class ReviewModel {
  // Get all reviews (admin)
  static async getAllReviews(limit = 20, offset = 0, filter = {}) {
    try {
      let query = `
        SELECT r.*, 
               m.title as movie_title,
               u.full_name as username, u.email
        FROM Reviews r
        LEFT JOIN Movies m ON r.movie_id = m.movie_id
        LEFT JOIN User u ON r.user_id = u.id
        WHERE 1=1
      `
      const params = []

      if (filter.movieId) {
        query += ` AND r.movie_id = ?`
        params.push(filter.movieId)
      }

      if (filter.status) {
        query += ` AND r.status = ?`
        params.push(filter.status)
      }

      query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
      params.push(limit, offset)

      const [results] = await db.query(query, params)
      return results || []
    } catch (error) {
      console.error('getAllReviews error:', error)
      throw error
    }
  }

  // Get reviews by movie (public)
  static async getReviewsByMovie(movieId, limit = 10, offset = 0) {
    try {
      const [results] = await db.query(
        `SELECT r.*, u.full_name as username, u.avatar
         FROM Reviews r
         LEFT JOIN User u ON r.user_id = u.id
         WHERE r.movie_id = ? AND r.status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [movieId, limit, offset]
      )
      return results || []
    } catch (error) {
      console.error('getReviewsByMovie error:', error)
      throw error
    }
  }

  // Get review count and rating for movie
  static async getMovieReviewStats(movieId) {
    try {
      const [results] = await db.query(
        `SELECT 
           COUNT(*) as count,
           AVG(CAST(rating AS DECIMAL(10,2))) as avg_rating,
           FLOOR(rating) as rating_floor,
           COUNT(*) as count_at_rating
         FROM Reviews
         WHERE movie_id = ? AND status = 'approved'
         GROUP BY FLOOR(rating)
         ORDER BY rating_floor DESC`,
        [movieId]
      )
      return results || []
    } catch (error) {
      console.error('getMovieReviewStats error:', error)
      throw error
    }
  }

  // Get total count (for pagination)
  static async getTotalCount(filter = {}) {
    try {
      let query = 'SELECT COUNT(*) as total FROM Reviews WHERE 1=1'
      const params = []

      if (filter.movieId) {
        query += ` AND movie_id = ?`
        params.push(filter.movieId)
      }

      if (filter.status) {
        query += ` AND status = ?`
        params.push(filter.status)
      }

      const [results] = await db.query(query, params)
      return results?.[0]?.total || 0
    } catch (error) {
      console.error('getTotalCount error:', error)
      throw error
    }
  }

  // Create review
  static async createReview(data) {
    const { movieId, userId, rating, comment, status = 'approved' } = data
    
    try {
      const [results] = await db.query(
        `INSERT INTO Reviews (movie_id, user_id, rating, comment, status)
         VALUES (?, ?, ?, ?, ?)`,
        [movieId, userId, rating, comment, status]
      )
      return { review_id: results.insertId, movieId, userId, rating, comment, status }
    } catch (error) {
      console.error('createReview error:', error)
      throw error
    }
  }

  // Update user's own review
  static async updateReview(reviewId, userId, data) {
    const { rating, comment } = data

    try {
      const [results] = await db.query(
        `UPDATE Reviews
         SET rating = ?, comment = ?, status = 'approved'
         WHERE review_id = ? AND user_id = ?`,
        [rating, comment, reviewId, userId]
      )

      return { success: results.affectedRows > 0 }
    } catch (error) {
      console.error('updateReview error:', error)
      throw error
    }
  }

  // Update review status (admin)
  static async updateReviewStatus(reviewId, status) {
    try {
      await db.query(
        'UPDATE Reviews SET status = ? WHERE review_id = ?',
        [status, reviewId]
      )
      return { success: true }
    } catch (error) {
      console.error('updateReviewStatus error:', error)
      throw error
    }
  }

  // Delete review (admin)
  static async deleteReview(reviewId) {
    try {
      await db.query(
        'DELETE FROM Reviews WHERE review_id = ?',
        [reviewId]
      )
      return { success: true }
    } catch (error) {
      console.error('deleteReview error:', error)
      throw error
    }
  }

  // Get single review
  static async getReviewById(reviewId) {
    try {
      const [results] = await db.query(
        'SELECT * FROM Reviews WHERE review_id = ?',
        [reviewId]
      )
      return results?.[0] || null
    } catch (error) {
      console.error('getReviewById error:', error)
      throw error
    }
  }

  // Get a user's review for a movie
  static async getUserReviewByMovie(movieId, userId) {
    try {
      const [results] = await db.query(
        `SELECT r.*, u.full_name as username, u.avatar
         FROM Reviews r
         LEFT JOIN User u ON r.user_id = u.id
         WHERE r.movie_id = ? AND r.user_id = ?
         LIMIT 1`,
        [movieId, userId]
      )
      return results?.[0] || null
    } catch (error) {
      console.error('getUserReviewByMovie error:', error)
      throw error
    }
  }

  // Check if user already reviewed this movie
  static async userHasReview(movieId, userId) {
    try {
      const [results] = await db.query(
        'SELECT review_id FROM Reviews WHERE movie_id = ? AND user_id = ?',
        [movieId, userId]
      )
      return results?.length > 0
    } catch (error) {
      console.error('userHasReview error:', error)
      throw error
    }
  }
}
