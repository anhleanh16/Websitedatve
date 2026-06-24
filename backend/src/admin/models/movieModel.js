import { db } from "../../../config/db.js";

export const MovieModel = {
  /**
   * Lấy tất cả phim (bao gồm cả phim trong thùng rác nếu có yêu cầu)
   * @param {boolean} isTrash - True nếu muốn lấy phim trong thùng rác
   * @returns {Promise<Array>} Danh sách phim
   */
  async findAll(isTrash = false) {
    const [movies] = await db.query(
      "SELECT * FROM Movies WHERE is_deleted = ? ORDER BY release_date DESC",
      [isTrash ? 1 : 0],
    );

    // Lấy danh mục cho từng phim
    const moviesWithCategories = await Promise.all(
      movies.map(async (movie) => {
        const [categories] = await db.query(
          `
          SELECT mc.category_id, mc.category_name
          FROM Movie_Categories mc
          JOIN Movie_Category_Detail mcd ON mc.category_id = mcd.category_id
          WHERE mcd.movie_id = ?
        `,
          [movie.movie_id],
        );

        return {
          ...movie,
          posters: movie.posters ? JSON.parse(movie.posters) : [],
          categories: categories,
        };
      }),
    );

    return moviesWithCategories;
  },

  /**
   * Tạo một phim mới
   * @param {object} movieData - Dữ liệu phim từ request body
   * @param {object} files - Các tệp đã upload (posters, trailer)
   * @returns {Promise<number>} ID của phim vừa tạo
   */
  async create(movieData, files) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const {
        title,
        description,
        duration,
        age_limit,
        director,
        actors,
        release_date,
        status,
        language,
        country,
        categories,
      } = movieData;

      let poster = null;
      let posters = [];
      if (files && files.posters) {
        const posterFiles = Array.isArray(files.posters)
          ? files.posters
          : [files.posters];
        if (posterFiles.length > 0) {
          poster = `/uploads/movies/${posterFiles[0].filename}`;
          posters = posterFiles
            .slice(1)
            .map((file) => `/uploads/movies/${file.filename}`);
        }
      }

      let trailer = null;
      if (files && files.trailer) {
        const trailerFiles = Array.isArray(files.trailer)
          ? files.trailer
          : [files.trailer];
        if (trailerFiles.length > 0) {
          trailer = `/uploads/trailers/${trailerFiles[0].filename}`;
        }
      }

      const [result] = await conn.query(
        "INSERT INTO Movies (title,description,duration,age_limit,director,actors,trailer,poster,posters,release_date,status,language,country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
          title,
          description,
          duration,
          age_limit,
          director,
          actors,
          trailer,
          poster,
          JSON.stringify(posters),
          release_date,
          status,
          language,
          country,
        ],
      );
      const movieId = result.insertId;

      if (categories && categories.length > 0) {
        const categoryIds = Array.isArray(categories)
          ? categories
          : [categories];
        for (const categoryId of categoryIds) {
          await conn.query(
            "INSERT INTO Movie_Category_Detail (movie_id, category_id) VALUES (?, ?)",
            [movieId, categoryId],
          );
        }
      }

      await conn.commit();
      return movieId;
    } catch (err) {
      await conn.rollback();
      // Ném lỗi để controller có thể bắt và xử lý
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * Cập nhật thông tin phim
   * @param {number} movieId - ID của phim cần cập nhật
   * @param {object} movieData - Dữ liệu phim từ request body
   * @param {object} files - Các tệp đã upload
   * @returns {Promise<boolean>} - True nếu cập nhật thành công
   */
  async update(movieId, movieData, files) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const {
        title,
        description,
        duration,
        age_limit,
        director,
        actors,
        release_date,
        status,
        language,
        country,
        existing_main_poster,
        existing_posters,
        categories,
      } = movieData;

      const [existingMovie] = await conn.query(
        "SELECT * FROM Movies WHERE movie_id = ?",
        [movieId],
      );
      if (!existingMovie.length) {
        throw new Error("Movie not found");
      }
      const movie = existingMovie[0];

      let poster = existing_main_poster || movie.poster;
      let posters = existing_posters
        ? JSON.parse(existing_posters)
        : movie.posters
          ? JSON.parse(movie.posters)
          : [];

      if (files && files.posters) {
        const posterFiles = Array.isArray(files.posters)
          ? files.posters
          : [files.posters];
        for (const file of posterFiles) {
          const filePath = `/uploads/movies/${file.filename}`;
          if (!poster) {
            poster = filePath;
          } else {
            posters.push(filePath);
          }
        }
      }

      let trailer = movie.trailer;
      if (files && files.trailer) {
        const trailerFiles = Array.isArray(files.trailer)
          ? files.trailer
          : [files.trailer];
        if (trailerFiles.length > 0) {
          trailer = `/uploads/trailers/${trailerFiles[0].filename}`;
        }
      }

      await conn.query(
        "UPDATE Movies SET title=?, description=?, duration=?, age_limit=?, director=?, actors=?, trailer=?, poster=?, posters=?, release_date=?, status=?, language=?, country=? WHERE movie_id=?",
        [
          title,
          description,
          duration,
          age_limit,
          director,
          actors,
          trailer,
          poster,
          JSON.stringify(posters),
          release_date,
          status,
          language,
          country,
          movieId,
        ],
      );

      await conn.query("DELETE FROM Movie_Category_Detail WHERE movie_id = ?", [
        movieId,
      ]);
      if (categories && categories.length > 0) {
        const categoryIds = Array.isArray(categories)
          ? categories
          : [categories];
        for (const categoryId of categoryIds) {
          await conn.query(
            "INSERT INTO Movie_Category_Detail (movie_id, category_id) VALUES (?, ?)",
            [movieId, categoryId],
          );
        }
      }

      await conn.commit();
      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async softDelete(movieId) {
    const [result] = await db.query(
      "UPDATE Movies SET is_deleted = 1 WHERE movie_id = ?",
      [movieId],
    );
    return result.affectedRows > 0;
  },

  async restore(movieId) {
    const [result] = await db.query(
      "UPDATE Movies SET is_deleted = 0 WHERE movie_id = ?",
      [movieId],
    );
    return result.affectedRows > 0;
  },

  async toggleHide(movieId) {
    const [rows] = await db.query(
      "SELECT is_hidden FROM Movies WHERE movie_id = ?",
      [movieId],
    );
    if (!rows.length) return null;

    const current = rows[0].is_hidden ? 1 : 0;
    const next = current === 1 ? 0 : 1;

    await db.query("UPDATE Movies SET is_hidden = ? WHERE movie_id = ?", [
      next,
      movieId,
    ]);

    return next === 1;
  },
};
