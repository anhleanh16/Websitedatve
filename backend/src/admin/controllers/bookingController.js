import { BookingModel } from "../models/bookingModel.js";

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
  try {
    const { orderId } = req.params;
    // Thêm logic kiểm tra xem vé có đủ điều kiện hoàn không
    const success = await BookingModel.updateStatus(orderId, "refunded");
    if (success) {
      // Thêm logic hoàn tiền vào tài khoản người dùng nếu cần
      res.json({ message: "Booking refunded successfully" });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    console.error("Error in refundBooking:", err);
    res.status(500).json({ message: "Failed to refund booking" });
  }
};

export const checkInBooking = async (req, res) => {
  try {
    const { orderId } = req.params;
    // Thêm logic kiểm tra xem vé đã được check-in chưa, hoặc có hợp lệ không
    const success = await BookingModel.updateStatus(orderId, "completed");
    if (success) {
      res.json({ message: "Check-in successful" });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (err) {
    console.error("Error in checkInBooking:", err);
    res.status(500).json({ message: "Failed to check-in booking" });
  }
};
