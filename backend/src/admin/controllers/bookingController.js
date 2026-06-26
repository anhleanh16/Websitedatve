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
