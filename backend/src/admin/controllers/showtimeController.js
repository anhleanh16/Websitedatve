import { ShowtimeModel } from "../models/showtimeModel.js";

export const getShowtimes = async (req, res) => {
  try {
    const showtimes = await ShowtimeModel.findAll();
    res.json({ showtimes });
  } catch (err) {
    console.error("Error in getShowtimes:", err);
    res.status(500).json({ message: "Error getting showtimes" });
  }
};

export const getShowtimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const showtime = await ShowtimeModel.findById(id);
    if (showtime) {
      res.json(showtime);
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    console.error("Error in getShowtimeById:", err);
    res.status(500).json({ message: "Error getting showtime details" });
  }
};

export const createShowtime = async (req, res) => {
  try {
    // Thêm logic kiểm tra xung đột lịch chiếu ở đây nếu cần
    const showtimeId = await ShowtimeModel.create(req.body);
    res
      .status(201)
      .json({ message: "Showtime created successfully", showtimeId });
  } catch (err) {
    console.error("Error in createShowtime:", err);
    res.status(500).json({ message: "Failed to create showtime" });
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await ShowtimeModel.update(id, req.body);
    if (success) {
      res.json({ message: "Showtime updated successfully" });
    } else {
      res
        .status(404)
        .json({ message: "Showtime not found or no changes made" });
    }
  } catch (err) {
    console.error("Error in updateShowtime:", err);
    res.status(500).json({ message: "Failed to update showtime" });
  }
};

export const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await ShowtimeModel.delete(id);
    if (success) {
      res.json({ message: "Showtime deleted successfully" });
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(400)
        .json({
          message: "Cannot delete showtime. It has associated bookings.",
        });
    }
    console.error("Error in deleteShowtime:", err);
    res.status(500).json({ message: "Failed to delete showtime" });
  }
};

export const cancelShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    // Thêm logic kiểm tra và xử lý hoàn vé cho các booking liên quan ở đây
    const success = await ShowtimeModel.cancel(id);
    if (success) {
      res.json({ message: "Showtime cancelled successfully" });
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    console.error("Error in cancelShowtime:", err);
    res.status(500).json({ message: "Failed to cancel showtime" });
  }
};

// --- Helper functions for UI ---
export const getShowtimeCinemas = async (req, res) => {
  try {
    const cinemas = await ShowtimeModel.getCinemas();
    res.json({ cinemas });
  } catch (err) {
    console.error("Error in getShowtimeCinemas:", err);
    res.status(500).json({ message: "Error getting cinemas" });
  }
};

export const getShowtimeRooms = async (req, res) => {
  try {
    const { cinemaId } = req.query;
    if (!cinemaId) {
      return res.status(400).json({ message: "Cinema ID is required" });
    }
    const rooms = await ShowtimeModel.getRoomsByCinema(cinemaId);
    res.json({ rooms });
  } catch (err) {
    console.error("Error in getShowtimeRooms:", err);
    res.status(500).json({ message: "Error getting rooms" });
  }
};
