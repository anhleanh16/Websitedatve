import { BookingModel } from "../models/bookingModel.js";
import bcrypt from "bcryptjs";
import { db } from "../../../config/db.js";
import {
  emailExists,
  getRoleIdByName,
} from "../models/authModel.js";

const generateTemporaryPassword = (length = 10) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const staffCreateBooking = async (req, res) => {
  try {
    const {
      mode = "existing_user",
      user_id,
      new_user,
      showtimeId,
      showtime_id,
      seatUnits,
      seat_units,
      foodItems,
      food_items,
      paymentMethod = "cashier",
      payment_method,
    } = req.body || {};

    const normalizedShowtimeId = Number(showtimeId || showtime_id || 0);
    const normalizedSeatUnits = seatUnits || seat_units || [];
    const normalizedFoodItems = foodItems || food_items || [];
    const finalPaymentMethod = String(
      payment_method || paymentMethod || "cashier",
    ).trim();

    if (!normalizedShowtimeId) {
      return res.status(400).json({ message: "Chưa chọn suất chiếu." });
    }

    if (!Array.isArray(normalizedSeatUnits) || normalizedSeatUnits.length === 0) {
      return res.status(400).json({ message: "Chưa chọn ghế." });
    }

    let finalUserId = Number(user_id || 0);
    let newUserCreated = null;

    if (mode === "new_user") {
      const info = new_user || {};
      const full_name = String(info.full_name || "").trim();
      const email = String(info.email || "").trim();
      const phone = String(info.phone || "").trim();
      const birthday = info.birthday || null;
      const sex = info.sex || null;

      if (!full_name) {
        return res.status(400).json({ message: "Vui lòng nhập họ tên khách hàng." });
      }
      if (!email) {
        return res.status(400).json({ message: "Vui lòng nhập email khách hàng." });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Email không hợp lệ." });
      }
      if (!phone) {
        return res.status(400).json({ message: "Vui lòng nhập số điện thoại khách hàng." });
      }
      if (await emailExists(email)) {
        return res.status(409).json({
          message: "Email đã có tài khoản trong hệ thống. Vui lòng chọn 'Đã có tài khoản'.",
        });
      }

      const roleId = await getRoleIdByName("user");
      const tempPassword = generateTemporaryPassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const sexMap = { male: "Nam", female: "Nu", other: "Khac" };
      const mappedSex = sexMap[sex] || sex || null;

      const [result] = await db.query(
        `INSERT INTO User (role_id, full_name, email, password, phone, birthday, sex, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          roleId,
          full_name,
          email,
          hashedPassword,
          phone || null,
          birthday || null,
          mappedSex,
        ],
      );
      finalUserId = Number(result.insertId);
      newUserCreated = {
        user_id: finalUserId,
        full_name,
        email,
        phone,
        temporary_password: tempPassword,
      };
    }

    if (!finalUserId || finalUserId <= 0) {
      return res.status(400).json({ message: "Chưa xác định được khách hàng." });
    }

    const bookingResult = await BookingModel.createUserBooking({
      userId: finalUserId,
      showtimeId: normalizedShowtimeId,
      seatUnits: normalizedSeatUnits,
      foodItems: normalizedFoodItems,
      paymentMethod: finalPaymentMethod,
    });

    return res.status(201).json({
      message: "Đặt vé thành công.",
      booking: bookingResult,
      new_user: newUserCreated,
    });
  } catch (err) {
    console.error("Error in staffCreateBooking:", err);
    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
      message: err.message || "Không thể đặt vé. Vui lòng thử lại.",
    });
  }
};

export const getAdminBookings = async (req, res) => {
  try {
    // Lấy các tham số filter và search từ query string
    const { status, search } = req.query;
    const filters = { status, search };

    const bookings = await BookingModel.findAll(filters);
    res.json({ bookings });
  } catch (err) {
    console.error("Error in getAdminBookings:", err);
    res.status(500).json({ message: "Error getting bookings" });
  }
};

export const getAdminBookingDetail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const booking = await BookingModel.findById(orderId);
    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    console.error("Error in getAdminBookingDetail:", err);
    res.status(500).json({ message: "Error getting booking details" });
  }
};

export const verifyBookingCode = async (req, res) => {
  try {
    const { code } = req.params;
    const booking = await BookingModel.findByCode(code);
    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ message: "Booking code not found" });
    }
  } catch (err) {
    console.error("Error in verifyBookingCode:", err);
    res.status(500).json({ message: "Error verifying booking code" });
  }
};

export const refundBooking = async (req, res) => {
  return res.status(403).json({
    message: "Chuc nang hoan ve da bi tat. Ve da dat khong duoc hoan.",
  });
};

export const checkInBooking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const success = await BookingModel.checkIn(orderId);
    if (success) {
      const booking = await BookingModel.findById(orderId);
      res.json({ message: "Check-in successful", booking });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    console.error("Error in checkInBooking:", err);
    res.status(500).json({ message: "Failed to check-in booking" });
  }
};
