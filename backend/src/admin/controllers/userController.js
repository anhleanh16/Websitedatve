import { UserModel } from "../models/userModel.js";

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAdminUsers = async (req, res) => {
  try {
    const users = await UserModel.findAdminUsers();

    // Thêm một cờ để cho frontend biết tài khoản nào không thể khóa
    const usersWithFlags = users.map((user) => ({
      ...user,
      // Tài khoản có user_id = 1 là admin gốc, không thể khóa
      can_be_locked: user.user_id !== 1,
    }));

    res.json({ users: usersWithFlags });
  } catch (err) {
    console.error("Error in getAdminUsers:", err);
    res.status(500).json({ message: "Error getting admin users", users: [] });
  }
};

export const deactivateAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Chuyển đổi userId sang số nguyên để so sánh chính xác
    const idToDeactivate = parseInt(userId, 10);

    // Quy tắc: Không cho phép khóa tài khoản admin gốc (ID = 1)
    if (idToDeactivate === 1) {
      return res
        .status(403)
        .json({ message: "Không thể khóa tài khoản quản trị viên gốc." });
    }

    const success = await UserModel.updateUserStatus(
      idToDeactivate,
      "inactive",
    );

    if (success) {
      res.json({ message: "User deactivated successfully" });
    } else {
      res
        .status(404)
        .json({ message: "User not found or could not be deactivated" });
    }
  } catch (err) {
    console.error("Error deactivating user:", err);
    res.status(500).json({ message: "Failed to deactivate user" });
  }
};
