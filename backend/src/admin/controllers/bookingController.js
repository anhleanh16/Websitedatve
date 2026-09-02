import { BookingModel } from "../models/bookingModel.js";
import bcrypt from "bcryptjs";
import { BIRTH_DATE_ERROR, isValidBirthDate } from "../../utils/birthDate.js";
import { db } from "../../../config/db.js";
import { sendTicketQrEmail } from "../../user/services/ticketEmailService.js";
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

const BOOKING_PHONE_REGEX = /^0\d{9,}$/;

export const staffCreateBooking = async (req, res) => {
  try {
    const {
      mode = "existing_user",
      user_id,
      new_user,
      guest_customer,
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
    let guestCustomer = null;

    if (mode === "guest") {
      const info = guest_customer || {};
      const full_name = String(info.full_name || "").trim();
      const phone = String(info.phone || "").trim();
      const email = String(info.email || "").trim();

      if (!full_name) {
        return res.status(400).json({ message: "Vui lòng nhập họ tên khách vãng lai." });
      }
      if (!phone) {
        return res.status(400).json({ message: "Vui lòng nhập số điện thoại khách vãng lai." });
      }
      if (!BOOKING_PHONE_REGEX.test(phone)) {
        return res.status(400).json({
          message: "Số điện thoại khách vãng lai phải bắt đầu bằng 0 và có ít nhất 10 chữ số.",
        });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: "Email không hợp lệ." });
      }

      finalUserId = 0;
      guestCustomer = { full_name, phone, email: email || null };
    }

    if (mode === "new_user") {
      const info = new_user || {};
      const full_name = String(info.full_name || "").trim();
      const email = String(info.email || "").trim();
      const phone = String(info.phone || "").trim();
      const birthday = info.birthday || null;
      const sex = info.sex || null;

      if (birthday && !isValidBirthDate(birthday)) {
        return res.status(400).json({ message: BIRTH_DATE_ERROR });
      }

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
      if (!BOOKING_PHONE_REGEX.test(phone)) {
        return res.status(400).json({
          message: "Số điện thoại khách hàng phải bắt đầu bằng 0 và có ít nhất 10 chữ số.",
        });
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

    if (mode !== "guest" && (!finalUserId || finalUserId <= 0)) {
      return res.status(400).json({ message: "Chưa xác định được khách hàng." });
    }

    const bookingResult = await BookingModel.createUserBooking({
      userId: finalUserId || null,
      guestCustomer,
      showtimeId: normalizedShowtimeId,
      seatUnits: normalizedSeatUnits,
      foodItems: normalizedFoodItems,
      paymentMethod: finalPaymentMethod,
    });

    if (mode !== 'guest' && bookingResult?.payment_status === 'paid') {
      try {
        await sendTicketQrEmail(bookingResult);
      } catch (mailError) {
        console.warn('Ticket email send failed (staff booking):', mailError.message);
      }
    }

    return res.status(201).json({
      message: "Đặt vé thành công.",
      booking: bookingResult,
      new_user: newUserCreated,
      guest_customer: guestCustomer,
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

export const confirmAdminBookingPayment = async (req, res) => {
  try {
    const orderId = Number(req.params.orderId || 0);
    const paymentMethod = String(req.body?.paymentMethod || req.body?.payment_method || '').trim();
    const paymentReference = String(req.body?.paymentReference || req.body?.payment_reference || '').trim();

    const booking = await BookingModel.confirmStaffPayment({
      orderId,
      paymentMethod,
      paymentReference,
    });

    if (booking?.customer_type !== 'guest') {
      try {
        await sendTicketQrEmail(booking);
      } catch (mailError) {
        console.warn('Ticket email send failed after staff payment:', mailError.message);
      }
    }

    return res.json({ message: 'Xác nhận thanh toán thành công.', booking });
  } catch (err) {
    console.error('Error in confirmAdminBookingPayment:', err);
    return res.status(err.statusCode || 500).json({
      message: err.message || 'Không thể xác nhận thanh toán.',
    });
  }
};

export const verifyBookingCode = async (req, res) => {
  try {
    const { code } = req.params;
    const booking = await BookingModel.findByCode(code);
    if (booking) {
      res.json({ booking });
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
    const qrToken = String(req.body?.qrToken || '').trim();

    const [[orderInfo]] = await db.query(
      "SELECT user_id, status FROM Orders WHERE order_id = ? LIMIT 1",
      [Number(orderId || 0)],
    );

    if (!orderInfo) {
      return res.status(404).json({ message: "Không tìm thấy vé này." });
    }

    const isGuestBooking = !orderInfo.user_id;
    if (!isGuestBooking && !qrToken) {
      return res.status(400).json({ message: "Chỉ có thể check-in bằng mã QR đã quét." });
    }

    const success = await BookingModel.checkIn(orderId, qrToken);
    if (success) {
      const booking = await BookingModel.findById(orderId);
      res.json({ message: isGuestBooking ? "Hoàn thành vé khách vãng lai." : "Check-in successful", booking });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    console.error("Error in checkInBooking:", err);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({ message: err.message || "Failed to check-in booking" });
  }
};
