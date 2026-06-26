import { StatisticsModel } from "../models/statisticsModel.js";

export const getStatistics = async (req, res) => {
  console.log("=== [DEBUG] getStatistics CALLED ===");
  console.log("Query params:", req.query);

  try {
    console.log("Calling StatisticsModel.getCompleteStats...");
    const stats = await StatisticsModel.getCompleteStats({
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      cinemaId: req.query.cinemaId,
    });
    console.log("Model returned stats. Overview:", stats.overview);
    res.json(stats);
  } catch (error) {
    console.error("=== [DEBUG] ERROR in getStatistics ===");
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      message: "Lỗi khi lấy thống kê",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
