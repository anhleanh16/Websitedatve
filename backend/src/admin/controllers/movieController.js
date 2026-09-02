import { MovieModel } from "../models/movieModel.js";

const MOVIE_STATUSES = new Set(["now_showing", "coming_soon", "ended"]);
const AGE_LIMITS = new Set([0, 13, 16, 18]);

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isValidYouTubeUrl = (value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    return url.protocol === "https:" && ["youtube.com", "m.youtube.com", "youtu.be"].includes(host);
  } catch {
    return false;
  }
};

const validateMoviePayload = (body = {}, files = {}, { creating = false } = {}) => {
  const title = String(body.title || "").trim();
  const director = String(body.director || "").trim();
  const duration = Number(body.duration);
  const status = String(body.status || "");
  const ageLimit = Number(body.age_limit);
  const categories = Array.isArray(body.categories) ? body.categories : body.categories ? [body.categories] : [];
  const posterFiles = Array.isArray(files?.posters) ? files.posters : [];
  const trailerFiles = Array.isArray(files?.trailer) ? files.trailer : [];
  const newPosterCount = posterFiles.length;
  const existingPosterCount = (body.existing_main_poster ? 1 : 0) + parseJsonArray(body.existing_posters).length;
  const posterCount = creating ? newPosterCount : newPosterCount + existingPosterCount;

  if (title.length < 2 || title.length > 150) return "Tên phim phải từ 2 đến 150 ký tự.";
  if (director.length < 2 || director.length > 150) return "Tên đạo diễn phải từ 2 đến 150 ký tự.";
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) return "Thời lượng phải là số nguyên từ 1 đến 600 phút.";
  if (String(body.description || "").trim().length > 5000) return "Mô tả không được vượt quá 5.000 ký tự.";
  if (String(body.actors || "").trim().length > 1000) return "Danh sách diễn viên không được vượt quá 1.000 ký tự.";
  if (String(body.language || "").trim().length > 100) return "Ngôn ngữ không được vượt quá 100 ký tự.";
  if (String(body.country || "").trim().length > 100) return "Quốc gia không được vượt quá 100 ký tự.";
  if (!MOVIE_STATUSES.has(status)) return "Trạng thái phim không hợp lệ.";
  if (!AGE_LIMITS.has(ageLimit)) return "Giới hạn tuổi không hợp lệ.";
  if (!categories.length || categories.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)) return "Vui lòng chọn ít nhất một Tag hợp lệ.";
  if (posterFiles.some(file => file.size > 5 * 1024 * 1024)) return "Mỗi poster không được vượt quá 5MB.";
  if (trailerFiles.some(file => file.size > 100 * 1024 * 1024)) return "Trailer không được vượt quá 100MB.";
  if (creating && posterCount < 6) return "Phim mới phải có ít nhất 6 poster.";
  if (!creating && posterCount < 1) return "Phim phải có ít nhất 1 poster.";
  if (posterCount > 12) return "Phim chỉ được có tối đa 12 poster.";
  if (body.trailer && !isValidYouTubeUrl(String(body.trailer).trim())) return "Link trailer YouTube không hợp lệ.";
  return "";
};

// ─── Movies ───────────────────────────────────────────────────────────────────
export const getAdminMovies = async (req, res) => {
  try {
    const { trash = "false" } = req.query;
    const isTrash = trash === "true";

    const movies = await MovieModel.findAll(isTrash);

    res.json({ movies });
  } catch (err) {
    console.error("Error in getAdminMovies:", err);
    res.status(500).json({ message: "Error getting movies", movies: [] });
  }
};

export const createMovie = async (req, res) => {
  try {
    console.log("=== CREATE MOVIE ===");
    console.log("req.body:", JSON.stringify(req.body, null, 2));
    console.log("req.files:", JSON.stringify(req.files, null, 2));
    const validationError = validateMoviePayload(req.body, req.files, { creating: true });
    if (validationError) return res.status(400).json({ message: validationError });
    const movieId = await MovieModel.create(req.body, req.files);
    res.status(201).json({ message: "Movie created successfully", movieId });
  } catch (err) {
    console.error("Error creating movie:", err);
    res.status(500).json({ message: "Failed to create movie", error: err.message });
  }
};

export const updateMovie = async (req, res) => {
  try {
    console.log("=== UPDATE MOVIE ===");
    console.log("req.body:", JSON.stringify(req.body, null, 2));
    console.log("req.files:", JSON.stringify(req.files, null, 2));
    const { id } = req.params;
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return res.status(400).json({ message: "Mã phim không hợp lệ." });
    const validationError = validateMoviePayload(req.body, req.files);
    if (validationError) return res.status(400).json({ message: validationError });
    const success = await MovieModel.update(id, req.body, req.files);

    if (success) {
      res.json({ message: "Movie updated successfully" });
    } else {
      res.status(404).json({ message: "Movie not found or update failed" });
    }
  } catch (err) {
    console.error("Error updating movie:", err);
    if (err.message === "Movie not found") {
      return res.status(404).json({ message: "Movie not found" });
    }
    res.status(500).json({ message: "Failed to update movie", error: err.message });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return res.status(400).json({ message: "Mã phim không hợp lệ." });
    const success = await MovieModel.softDelete(id);
    if (success) {
      res.json({ message: "Movie moved to trash successfully" });
    } else {
      res.status(404).json({ message: "Movie not found" });
    }
  } catch (err) {
    console.error("Error deleting movie:", err);
    res.status(500).json({ message: "Failed to delete movie" });
  }
};

export const restoreMovie = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return res.status(400).json({ message: "Mã phim không hợp lệ." });
    const success = await MovieModel.restore(id);
    if (success) {
      res.json({ message: "Movie restored successfully" });
    } else {
      res.status(404).json({ message: "Movie not found" });
    }
  } catch (err) {
    console.error("Error restoring movie:", err);
    res.status(500).json({ message: "Failed to restore movie" });
  }
};

export const toggleHideMovie = async (req, res) => {
  try {
    const { id } = req.params;
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return res.status(400).json({ message: "Mã phim không hợp lệ." });
    const newHiddenValue = await MovieModel.toggleHide(id);
    if (newHiddenValue !== null) {
      res.json({
        message: `Movie ${newHiddenValue ? "hidden" : "shown"} successfully`,
        is_hidden: newHiddenValue ? 1 : 0,
      });
    } else {
      res.status(404).json({ message: "Movie not found" });
    }
  } catch (err) {
    console.error("Error toggling movie visibility:", err);
    res.status(500).json({ message: "Failed to toggle movie visibility" });
  }
};
