import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../uploads');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Lunexa',
};

const movieSeedData = [
  {
    title: 'Northern Lights: Dawn of Hope',
    description: 'A thrilling adventure where a small team races to save an ancient artifact before it disappears forever.',
    duration: 128,
    age_limit: 13,
    director: 'Lê Thanh',
    actors: 'Nguyễn Văn A, Trần Thị B, Phạm C',
    release_date: '2026-08-10',
    status: 'coming_soon',
    language: 'Tiếng Việt',
    country: 'Việt Nam',
    categories: ['Hành động', 'Phiêu lưu'],
  },
  {
    title: 'Midnight City Heroes',
    description: 'When the city sleeps, unlikely heroes rise to protect the streets from dangerous shadows.',
    duration: 112,
    age_limit: 16,
    director: 'Hoàng Sơn',
    actors: 'Trương Minh, Vũ Hương, Đỗ Lan',
    release_date: '2026-07-20',
    status: 'now_showing',
    language: 'Tiếng Việt',
    country: 'Việt Nam',
    categories: ['Hành động', 'Khoa học viễn tưởng'],
  },
  {
    title: 'Cloud Garden',
    description: 'A magical family story about a hidden garden that appears when the clouds call.',
    duration: 104,
    age_limit: 0,
    director: 'Ngô Khánh',
    actors: 'Bé Minh, Mai Phương, Hữu Đức',
    release_date: '2026-06-15',
    status: 'now_showing',
    language: 'Tiếng Việt',
    country: 'Việt Nam',
    categories: ['Hoạt hình', 'Gia đình'],
  },
  {
    title: 'Starlight Rebellion',
    description: 'A scientist and a young pilot join forces to stop an extraterrestrial invasion.',
    duration: 137,
    age_limit: 16,
    director: 'Phạm Kiều',
    actors: 'Hoài An, Quốc Trung, Ly Na',
    release_date: '2026-08-01',
    status: 'now_showing',
    language: 'Tiếng Việt',
    country: 'Việt Nam',
    categories: ['Khoa học viễn tưởng', 'Hành động'],
  },
  {
    title: 'The Forgotten Melody',
    description: 'A heartwarming romance about memories, second chances, and the song that brought two souls together.',
    duration: 119,
    age_limit: 13,
    director: 'Nguyễn Hậu',
    actors: 'Thanh Hà, Minh Quân, Hạ My',
    release_date: '2026-09-05',
    status: 'coming_soon',
    language: 'Tiếng Việt',
    country: 'Việt Nam',
    categories: ['Tình cảm', 'Nhạc kịch'],
  },
];

const categoriesList = ['Hành động', 'Phiêu lưu', 'Hoạt hình', 'Khoa học viễn tưởng', 'Gia đình', 'Tình cảm', 'Nhạc kịch'];

const getUploadFiles = async (subfolder) => {
  const folder = path.resolve(uploadsDir, subfolder);
  const files = await fs.readdir(folder);
  return files.filter((name) => !name.startsWith('.'));
};

const createCategoryMap = async (connection) => {
  const categoryMap = new Map();
  for (const categoryName of categoriesList) {
    const [existing] = await connection.query(
      'SELECT category_id FROM movie_categories WHERE category_name = ? LIMIT 1',
      [categoryName],
    );
    if (existing.length > 0) {
      categoryMap.set(categoryName, existing[0].category_id);
      continue;
    }

    const [result] = await connection.query(
      'INSERT INTO movie_categories (category_name) VALUES (?)',
      [categoryName],
    );
    categoryMap.set(categoryName, result.insertId);
  }
  return categoryMap;
};

const insertMovie = async (connection, movie, posterFile, trailerFile, categoryIds = []) => {
  const posterPath = posterFile ? `/uploads/movies/${posterFile}` : null;
  const trailerPath = trailerFile ? `/uploads/trailers/${trailerFile}` : null;
  const posters = posterFile ? JSON.stringify([posterPath]) : null;

  const [existing] = await connection.query(
    'SELECT movie_id FROM movies WHERE title = ? LIMIT 1',
    [movie.title],
  );
  if (existing.length > 0) {
    return { skipped: true, title: movie.title };
  }

  const [result] = await connection.query(
    'INSERT INTO movies (title, description, duration, age_limit, director, actors, trailer, poster, posters, release_date, status, language, country) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      movie.title,
      movie.description,
      movie.duration,
      movie.age_limit,
      movie.director,
      movie.actors,
      trailerPath,
      posterPath,
      posters,
      movie.release_date,
      movie.status,
      movie.language,
      movie.country,
    ],
  );

  const movieId = result.insertId;
  for (const categoryId of categoryIds) {
    await connection.query(
      'INSERT INTO movie_category_detail (movie_id, category_id) VALUES (?, ?)',
      [movieId, categoryId],
    );
  }

  return { skipped: false, title: movie.title, movieId };
};

const main = async () => {
  const posters = await getUploadFiles('movies');
  const trailers = await getUploadFiles('trailers');

  if (posters.length === 0 || trailers.length === 0) {
    console.error('Không tìm thấy poster hoặc trailer trong backend/uploads.');
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbConfig);
  try {
    const categoryMap = await createCategoryMap(connection);
    const results = [];

    for (let index = 0; index < movieSeedData.length; index += 1) {
      const movie = movieSeedData[index];
      const posterFile = posters[index % posters.length];
      const trailerFile = trailers[index % trailers.length];
      const categoryIds = (movie.categories || [])
        .map((name) => categoryMap.get(name))
        .filter(Boolean);

      const result = await insertMovie(connection, movie, posterFile, trailerFile, categoryIds);
      results.push(result);
    }

    console.log('--- Kết quả seed phim ---');
    for (const result of results) {
      if (result.skipped) {
        console.log(`Bỏ qua phim đã tồn tại: ${result.title}`);
      } else {
        console.log(`Đã thêm phim: ${result.title} (ID: ${result.movieId})`);
      }
    }

    console.log('Seed phim hoàn tất.');
  } catch (err) {
    console.error('Lỗi khi seed phim:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

main();
