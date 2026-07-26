import bcrypt from "bcryptjs";
import { db } from "../../../config/db.js";
import { UserModel } from "../models/userModel.js";
import {
  createUser,
  emailExists,
  getRoleIdByName,
} from "../models/authModel.js";

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

export const createAdminUser = async (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      phone,
      birthday,
      sex,
      role = "user",
      status = "active",
    } = req.body || {};

    if (!full_name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }

    if (await emailExists(email)) {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }

    const normalizedRole = ["user", "admin"].includes(role) ? role : "user";
    const roleId = await getRoleIdByName(normalizedRole);
    if (!roleId) {
      return res.status(400).json({ message: "Vai trò không hợp lệ." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sexMap = { male: "Nam", female: "Nu", other: "Khac" };
    const mappedSex = sexMap[sex] || sex || null;
    const userId = await createUser({
      roleId,
      full_name,
      email,
      password: hashedPassword,
      phone: phone || null,
      birthday: birthday || null,
      sex: mappedSex,
    });

    if (status !== "active") {
      await UserModel.updateUserStatus(userId, status);
    }

    res
      .status(201)
      .json({ message: "Tạo người dùng thành công.", userId });
  } catch (err) {
    console.error("Error in createAdminUser:", err);
    res
      .status(500)
      .json({ message: err.message || "Không thể tạo người dùng." });
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

const normalizeStr = (v) =>
  v === null || v === undefined ? "" : String(v).trim().toLowerCase();

const normalizeDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v).trim();
  return d.toISOString().slice(0, 10);
};

export const resetAdminUserPassword = async (req, res) => {
  try {
    const userId = Number(req.params.userId || 0);
    const { full_name, email, phone, birthday, new_password } = req.body || {};

    if (!userId || userId <= 0) {
      return res.status(400).json({ message: "Không xác định được người dùng." });
    }

    if (!new_password || new_password.length < 6) {
      return res
        .status(400)
        .json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const [[user]] = await db.query(
      `SELECT id, full_name, email, phone, birthday FROM User WHERE id = ?`,
      [userId],
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const expected = {
      full_name: normalizeStr(user.full_name),
      email: normalizeStr(user.email),
      phone: normalizeStr(user.phone),
      birthday: normalizeDate(user.birthday),
    };
    const provided = {
      full_name: normalizeStr(full_name),
      email: normalizeStr(email),
      phone: normalizeStr(phone),
      birthday: normalizeDate(birthday),
    };

    const mismatches = [];
    if (expected.full_name && expected.full_name !== provided.full_name)
      mismatches.push("họ tên");
    if (expected.email && expected.email !== provided.email)
      mismatches.push("email");
    if (expected.phone && expected.phone !== provided.phone)
      mismatches.push("số điện thoại");
    if (expected.birthday && expected.birthday !== provided.birthday)
      mismatches.push("ngày sinh");

    if (mismatches.length > 0) {
      return res.status(400).json({
        message:
          "Thông tin xác minh không chính xác: " +
          mismatches.join(", ") +
          ". Vui lòng kiểm tra lại.",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);
    const [updateResult] = await db.query(
      "UPDATE User SET password = ? WHERE id = ?",
      [hashedPassword, userId],
    );

    if (updateResult.affectedRows === 0) {
      return res
        .status(500)
        .json({ message: "Không thể cập nhật mật khẩu. Vui lòng thử lại." });
    }

    res.json({ message: "Cấp lại mật khẩu thành công." });
  } catch (err) {
    console.error("Error in resetAdminUserPassword:", err);
    res.status(500).json({
      message: err?.message || "Không thể cấp lại mật khẩu. Vui lòng thử lại.",
    });
  }
};
