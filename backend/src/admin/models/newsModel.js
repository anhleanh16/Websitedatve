import { db } from "../../../config/db.js";

const NEWS_CATEGORIES = new Set([
  "movie_news",
  "promotion",
  "event",
  "coming_soon",
  "review",
  "announcement",
]);

const NEWS_STATUSES = new Set(["draft", "published", "hidden"]);

const sanitizeShortDescription = (value) => {
  if (!value) return "";

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
};

const sanitizeNewsRow = (row) => {
  if (!row) return row;

  return {
    ...row,
    short_description: sanitizeShortDescription(row.short_description || "") || null,
  };
};

const slugify = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);

const ensureUniqueSlug = async (baseSlug, excludeNewsId = null, connection = db) => {
  const fallbackBase = baseSlug || `news-${Date.now()}`;
  let candidate = fallbackBase;
  let counter = 1;

  while (true) {
    const params = [candidate];
    let sql = "SELECT news_id FROM news WHERE slug = ?";

    if (excludeNewsId) {
      sql += " AND news_id != ?";
      params.push(excludeNewsId);
    }

    sql += " LIMIT 1";

    const [[row]] = await connection.query(sql, params);
    if (!row) return candidate;

    counter += 1;
    candidate = `${fallbackBase}-${counter}`;
  }
};

const resolveEmployeeIdByUserId = async (userId, connection = db) => {
  const [[employee]] = await connection.query(
    `
    SELECT employee_id
    FROM Employees
    WHERE user_id = ?
    LIMIT 1
  `,
    [userId],
  );

  if (employee?.employee_id) {
    return employee.employee_id;
  }

  const employeeCode = `EMP-${String(userId).padStart(4, "0")}`;
  const [result] = await connection.query(
    `
    INSERT INTO Employees (user_id, employee_code, position, hire_date, salary, status)
    VALUES (?, ?, 'Admin', CURDATE(), 0, 'active')
  `,
    [userId, employeeCode],
  );

  return result.insertId;
};

const mapNewsPayload = async (payload = {}, { excludeNewsId = null, connection = db } = {}) => {
  const title = String(payload.title || "").trim();
  const content = String(payload.content || "").trim();
  const shortDescription = String(
    payload.short_description || payload.shortDescription || "",
  ).trim();
  const thumbnail = String(payload.thumbnail || "").trim();
  const category = String(payload.category || "").trim();
  const status = String(payload.status || "draft").trim();
  const publishedAt =
    payload.published_at ||
    payload.publishedAt ||
    (status === "published" ? new Date() : null);

  if (!title) {
    throw new Error("Tiêu đề tin tức là bắt buộc.");
  }

  if (!content) {
    throw new Error("Nội dung tin tức là bắt buộc.");
  }

  if (!NEWS_CATEGORIES.has(category)) {
    throw new Error("Danh mục tin tức không hợp lệ.");
  }

  if (!NEWS_STATUSES.has(status)) {
    throw new Error("Trạng thái tin tức không hợp lệ.");
  }

  const baseSlug = slugify(payload.slug || title);
  const slug = await ensureUniqueSlug(baseSlug, excludeNewsId, connection);

  return {
    title,
    slug,
    thumbnail: thumbnail || null,
    shortDescription: shortDescription || null,
    content,
    category,
    status,
    publishedAt:
      status === "published"
        ? publishedAt || new Date()
        : publishedAt || null,
  };
};

export const NewsModel = {
  async findAll(filters = {}) {
    const params = [];
    const where = [];

    if (filters.search) {
      where.push("(n.title LIKE ? OR n.short_description LIKE ? OR n.content LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.category && NEWS_CATEGORIES.has(filters.category)) {
      where.push("n.category = ?");
      params.push(filters.category);
    }

    if (filters.status && NEWS_STATUSES.has(filters.status)) {
      where.push("n.status = ?");
      params.push(filters.status);
    }

    const [rows] = await db.query(
      `
      SELECT
        n.news_id,
        n.title,
        n.slug,
        n.thumbnail,
        n.short_description,
        n.content,
        n.category,
        n.author_id,
        n.view_count,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        e.employee_code,
        e.position,
        u.id AS author_user_id,
        u.full_name AS author_name,
        u.email AS author_email
      FROM news n
      LEFT JOIN Employees e ON e.employee_id = n.author_id
      LEFT JOIN User u ON u.id = e.user_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        COALESCE(n.published_at, n.created_at) DESC,
        n.news_id DESC
    `,
      params,
    );

    return rows.map(sanitizeNewsRow);
  },

  async findById(newsId) {
    const [[row]] = await db.query(
      `
      SELECT
        n.news_id,
        n.title,
        n.slug,
        n.thumbnail,
        n.short_description,
        n.content,
        n.category,
        n.author_id,
        n.view_count,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        e.employee_code,
        e.position,
        u.id AS author_user_id,
        u.full_name AS author_name,
        u.email AS author_email
      FROM news n
      LEFT JOIN Employees e ON e.employee_id = n.author_id
      LEFT JOIN User u ON u.id = e.user_id
      WHERE n.news_id = ?
      LIMIT 1
    `,
      [newsId],
    );

    return sanitizeNewsRow(row) || null;
  },

  async findBySlug(slug) {
    const [[row]] = await db.query(
      `
      SELECT
        n.news_id,
        n.title,
        n.slug,
        n.thumbnail,
        n.short_description,
        n.content,
        n.category,
        n.author_id,
        n.view_count,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        e.employee_code,
        e.position,
        u.id AS author_user_id,
        u.full_name AS author_name,
        u.email AS author_email
      FROM news n
      LEFT JOIN Employees e ON e.employee_id = n.author_id
      LEFT JOIN User u ON u.id = e.user_id
      WHERE n.slug = ?
      LIMIT 1
    `,
      [slug],
    );

    return sanitizeNewsRow(row) || null;
  },

  async findPublic(filters = {}) {
    const params = [];
    const where = ["n.status = 'published'"];

    if (filters.search) {
      where.push("(n.title LIKE ? OR n.short_description LIKE ? OR n.content LIKE ?)");
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.category && NEWS_CATEGORIES.has(filters.category)) {
      where.push("n.category = ?");
      params.push(filters.category);
    }

    let limitSql = "";
    if (Number(filters.limit) > 0) {
      limitSql = "LIMIT ?";
      params.push(Number(filters.limit));
    }

    const [rows] = await db.query(
      `
      SELECT
        n.news_id,
        n.title,
        n.slug,
        n.thumbnail,
        n.short_description,
        n.content,
        n.category,
        n.author_id,
        n.view_count,
        n.status,
        n.published_at,
        n.created_at,
        n.updated_at,
        e.employee_code,
        e.position,
        u.id AS author_user_id,
        u.full_name AS author_name,
        u.email AS author_email
      FROM news n
      LEFT JOIN Employees e ON e.employee_id = n.author_id
      LEFT JOIN User u ON u.id = e.user_id
      WHERE ${where.join(" AND ")}
      ORDER BY
        COALESCE(n.published_at, n.created_at) DESC,
        n.news_id DESC
      ${limitSql}
    `,
      params,
    );

    return rows.map(sanitizeNewsRow);
  },

  async findPublicBySlugAndIncreaseView(slug) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const [[row]] = await connection.query(
        `
        SELECT
          n.news_id,
          n.title,
          n.slug,
          n.thumbnail,
          n.short_description,
          n.content,
          n.category,
          n.author_id,
          n.view_count,
          n.status,
          n.published_at,
          n.created_at,
          n.updated_at,
          e.employee_code,
          e.position,
          u.id AS author_user_id,
          u.full_name AS author_name,
          u.email AS author_email
        FROM news n
        LEFT JOIN Employees e ON e.employee_id = n.author_id
        LEFT JOIN User u ON u.id = e.user_id
        WHERE n.slug = ? AND n.status = 'published'
        LIMIT 1
      `,
        [slug],
      );

      if (!row) {
        await connection.rollback();
        return null;
      }

      await connection.query(
        "UPDATE news SET view_count = view_count + 1 WHERE news_id = ?",
        [row.news_id],
      );

      await connection.commit();
      return sanitizeNewsRow({
        ...row,
        view_count: Number(row.view_count || 0) + 1,
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async create(payload, userId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      const authorId = await resolveEmployeeIdByUserId(userId, connection);
      const data = await mapNewsPayload(payload, { connection });

      const [result] = await connection.query(
        `
        INSERT INTO news (
          title, slug, thumbnail, short_description, content,
          category, author_id, view_count, status, published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `,
        [
          data.title,
          data.slug,
          data.thumbnail,
          data.shortDescription,
          data.content,
          data.category,
          authorId,
          data.status,
          data.publishedAt,
        ],
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async update(newsId, payload) {
    const data = await mapNewsPayload(payload, { excludeNewsId: newsId });
    const [result] = await db.query(
      `
      UPDATE news
      SET
        title = ?,
        slug = ?,
        thumbnail = ?,
        short_description = ?,
        content = ?,
        category = ?,
        status = ?,
        published_at = ?
      WHERE news_id = ?
    `,
      [
        data.title,
        data.slug,
        data.thumbnail,
        data.shortDescription,
        data.content,
        data.category,
        data.status,
        data.publishedAt,
        newsId,
      ],
    );

    return result.affectedRows > 0;
  },

  async delete(newsId) {
    const [result] = await db.query("DELETE FROM news WHERE news_id = ?", [newsId]);
    return result.affectedRows > 0;
  },
};
