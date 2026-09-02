import bcrypt from "bcryptjs";
import { BIRTH_DATE_ERROR, isValidBirthDate } from "../../utils/birthDate.js";
import { db } from "../../../config/db.js";
import { UserModel } from "../models/userModel.js";
import {
  createUser,
  emailExists,
  ensureEmailVerificationSchema,
  ensureRoleExists,
  ensureUserNameSchema,
  userNameExists,
} from "../models/authModel.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const normalizePhone = (value) => String(value || "").replace(/[\s.()-]/g, "");
const passwordValidationMessage = (password, label = "Mật khẩu") => {
  if (!password || password.length < 6) return `${label} phải có ít nhất 6 ký tự.`;
  if (password.length > 72) return `${label} không được vượt quá 72 ký tự.`;
  if (/\s/.test(password)) return `${label} không được chứa khoảng trắng.`;
  if (!/[A-Za-zÀ-ỹ]/.test(password) || !/\d/.test(password)) return `${label} phải có ít nhất một chữ cái và một chữ số.`;
  return "";
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const getAdminUsers = async (req, res) => {
  try {
    await ensureEmailVerificationSchema();
    await ensureUserNameSchema();
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

export const getRoleSummary = async (req, res) => {
  try {
    const roles = await UserModel.findRoleSummary();
    res.json({ roles });
  } catch (err) {
    console.error("Error in getRoleSummary:", err);
    res.status(500).json({ message: "Không thể tải tổng quan vai trò.", roles: [] });
  }
};

export const createAdminUser = async (req, res) => {
  try {
    const {
      full_name,
      user_name,
      email,
      password,
      phone,
      birthday,
      sex,
      status = "active",
    } = req.body || {};
    const normalizedFullName = String(full_name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    const normalizedUserName = String(user_name || "").trim().toLowerCase();
    await ensureEmailVerificationSchema();
    await ensureUserNameSchema();

    if (!normalizedFullName || !normalizedUserName || !password) {
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ họ tên, tên người dùng và mật khẩu." });
    }

    if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
      return res.status(400).json({ message: "Họ tên phải từ 2 đến 100 ký tự." });
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUserName)) {
      return res.status(400).json({ message: "Tên người dùng gồm 3–30 ký tự: chữ, số, dấu chấm, gạch dưới hoặc gạch ngang." });
    }

    const passwordError = passwordValidationMessage(password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    if (birthday && !isValidBirthDate(birthday)) {
      return res.status(400).json({ message: BIRTH_DATE_ERROR });
    }

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ message: "Email không hợp lệ." });
    }

    if (normalizedPhone && !PHONE_PATTERN.test(normalizedPhone)) {
      return res.status(400).json({ message: "Số điện thoại Việt Nam không hợp lệ." });
    }

    if (!["active", "inactive", "blocked"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái tài khoản không hợp lệ." });
    }

    if (sex && !["male", "female", "other", "Nam", "Nu", "Khac"].includes(sex)) {
      return res.status(400).json({ message: "Giới tính không hợp lệ." });
    }

    if (normalizedEmail && await emailExists(normalizedEmail)) {
      return res.status(409).json({ message: "Email đã được sử dụng." });
    }

    // Accounts created from user management always start as customers.
    // Employee assignment is the only workflow that promotes the role to staff.
    const roleId = await ensureRoleExists("user", "Khách hàng");

    if (!normalizedEmail && !normalizedPhone) {
      return res.status(400).json({ message: "Cần nhập số điện thoại khi chưa liên kết email để người dùng có thể đăng nhập." });
    }

    if (await userNameExists(normalizedUserName)) {
      return res.status(409).json({ message: "Tên người dùng đã được sử dụng." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const storedEmail = normalizedEmail || `unlinked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@unlinked.local`;
    const sexMap = { male: "Nam", female: "Nu", other: "Khac" };
    const mappedSex = sexMap[sex] || sex || null;
    const userId = await createUser({
      roleId,
      full_name: normalizedFullName,
      user_name: normalizedUserName,
      email: storedEmail,
      password: hashedPassword,
      phone: normalizedPhone || null,
      birthday: birthday || null,
      sex: mappedSex,
    });

    if (status !== "active") {
      await UserModel.updateUserStatus(userId, status);
    }

    await db.query(
      `UPDATE User
       SET email_verified = ?,
           must_change_password = 1,
           email_verified_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
       WHERE id = ?`,
      [status === "active" ? 1 : 0, status === "active" ? 1 : 0, userId],
    );

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
      "blocked",
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

export const lockAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const idToLock = parseInt(userId, 10);

    if (idToLock === 1) {
      return res
        .status(403)
        .json({ message: "Không thể khóa tài khoản quản trị viên gốc." });
    }

    const success = await UserModel.updateUserStatus(idToLock, "blocked");
    if (success) {
      res.json({ message: "User locked successfully" });
    } else {
      res.status(404).json({ message: "User not found or could not be locked" });
    }
  } catch (err) {
    console.error("Error locking user:", err);
    res.status(500).json({ message: "Failed to lock user" });
  }
};

export const unlockAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const idToUnlock = parseInt(userId, 10);

    if (idToUnlock === 1) {
      return res
        .status(403)
        .json({ message: "Không thể mở khóa tài khoản quản trị viên gốc." });
    }

    const success = await UserModel.updateUserStatus(idToUnlock, "active");
    if (success) {
      res.json({ message: "User unlocked successfully" });
    } else {
      res.status(404).json({ message: "User not found or could not be unlocked" });
    }
  } catch (err) {
    console.error("Error unlocking user:", err);
    res.status(500).json({ message: "Failed to unlock user" });
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

export const searchAdminUsers = async (req, res) => {
  try {
    const { query = "" } = req.query;
    const trimmed = String(query || "").trim();

    // Không cho phép search khi query rỗng
    if (!trimmed) {
      return res.json({ users: [] });
    }

    const q = `%${trimmed}%`;

    const [users] = await db.query(
      `SELECT
        u.id as user_id,
        u.full_name,
        u.email,
        u.phone as phone_number,
        CASE
          WHEN u.id = 1 THEN 'admin'
          WHEN LOWER(COALESCE(e.position, '')) LIKE '%quản lý%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%manager%'
            OR LOWER(COALESCE(r.role_name, '')) IN ('manager', 'quan ly', 'quản lý') THEN 'manager'
          WHEN LOWER(COALESCE(e.position, '')) LIKE '%kỹ thuật%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%technician%'
            OR LOWER(COALESCE(e.position, '')) LIKE '%technical%'
            OR LOWER(COALESCE(r.role_name, '')) IN ('technician', 'technical') THEN 'technician'
          WHEN e.employee_id IS NOT NULL
            OR LOWER(COALESCE(r.role_name, '')) IN ('employee', 'staff', 'nhan vien', 'nhân viên') THEN 'staff'
          ELSE 'user'
        END as role,
        e.position as employee_position,
        u.status,
        u.birthday,
        u.sex,
        u.point as points,
        ml.level_name as membership_level,
        COALESCE(ml.discount_percent, 0) as membership_discount,
        u.created_at
      FROM User u
      LEFT JOIN Roles r ON u.role_id = r.role_id
      LEFT JOIN Employees e ON e.user_id = u.id
      LEFT JOIN Membership_Levels ml
        ON u.point >= ml.min_points AND u.point <= ml.max_points
      WHERE u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?
      ORDER BY u.created_at DESC
      LIMIT 20`,
      [q, q, q],
    );

    const usersWithFlags = users.map((user) => ({
      ...user,
      can_be_locked: user.user_id !== 1,
    }));

    res.json({ users: usersWithFlags });
  } catch (err) {
    console.error("Error in searchAdminUsers:", err);
    res.status(500).json({ message: "Error searching users", users: [] });
  }
};

export const resetAdminUserPassword = async (req, res) => {
  try {
    const userId = Number(req.params.userId || 0);
    const { full_name, email, phone, birthday, new_password } = req.body || {};

    if (!userId || userId <= 0) {
      return res.status(400).json({ message: "Không xác định được người dùng." });
    }

    const normalizedFullName = String(full_name || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedFullName || normalizedFullName.length < 2 || normalizedFullName.length > 100) {
      return res.status(400).json({ message: "Họ tên xác minh phải từ 2 đến 100 ký tự." });
    }
    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({ message: "Email xác minh không hợp lệ." });
    }
    if (normalizedPhone && !PHONE_PATTERN.test(normalizedPhone)) {
      return res.status(400).json({ message: "Số điện thoại xác minh không hợp lệ." });
    }
    if (birthday && !isValidBirthDate(birthday)) {
      return res.status(400).json({ message: BIRTH_DATE_ERROR });
    }
    const passwordError = passwordValidationMessage(new_password, "Mật khẩu mới");
    if (passwordError) return res.status(400).json({ message: passwordError });

    const [[user]] = await db.query(
      `SELECT id, full_name, email, phone, birthday FROM User WHERE id = ?`,
      [userId],
    );

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const expected = {
      full_name: normalizeStr(user.full_name),
      email: String(user.email || "").toLowerCase().endsWith("@unlinked.local") ? "" : normalizeStr(user.email),
      phone: normalizeStr(user.phone),
      birthday: normalizeDate(user.birthday),
    };
    const provided = {
      full_name: normalizeStr(full_name),
      email: normalizeStr(normalizedEmail),
      phone: normalizeStr(normalizedPhone),
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
