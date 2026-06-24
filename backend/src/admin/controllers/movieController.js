import { MovieModel } from "../models/movieModel.js";

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
    const movieId = await MovieModel.create(req.body, req.files);
    res.status(201).json({ message: "Movie created successfully", movieId });
  } catch (err) {
    console.error("Error creating movie:", err);
    res.status(500).json({ message: "Failed to create movie" });
  }
};

export const updateMovie = async (req, res) => {
  try {
    const { id } = req.params;
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
    res.status(500).json({ message: "Failed to update movie" });
  }
};

export const deleteMovie = async (req, res) => {
  try {
    const { id } = req.params;
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
