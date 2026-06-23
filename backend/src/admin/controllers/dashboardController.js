import { DashboardModel } from "../models/dashboardModel.js";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const stats = await DashboardModel.getStats();
    res.json(stats);
  } catch (err) {
    console.error("Error in getDashboardStats:", err);
    res.status(500).json({ message: "Error getting dashboard stats" });
  }
};
