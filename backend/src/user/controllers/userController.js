import * as CinemaModel from "../../admin/models/cinemaModel.js";

const normalizeCinemaImagePath = (cinema) => {
  if (!cinema) return cinema;
  const image = cinema.image;
  if (!image) return cinema;
  if (typeof image === "string" && image.startsWith("/uploads/cinema-")) {
    return {
      ...cinema,
      image: image.replace("/uploads/", "/uploads/cinemas/"),
    };
  }
  return cinema;
};

export const getPublicCinemas = async (req, res) => {
  try {
    const cinemas = await CinemaModel.findAll();
    res.json({ cinemas: cinemas.map(normalizeCinemaImagePath) });
  } catch (error) {
    console.error("Error getting public cinemas:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách rạp" });
  }
};

export const getPublicCinemaById = async (req, res) => {
  try {
    const cinema = await CinemaModel.findById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: "Không tìm thấy rạp phim" });
    }
    res.json({ cinema: normalizeCinemaImagePath(cinema) });
  } catch (error) {
    console.error(`Error getting public cinema ${req.params.id}:`, error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy chi tiết rạp" });
  }
};

export const userGetProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({ user: { id: userId, name: "", email: "" } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address } = req.body;
    res.json({ message: "Profile updated" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userGetBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({ bookings: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userCreateBooking = async (req, res) => {
  try {
    const { userId } = req.params;
    const { movieId, showId, seats } = req.body;
    res.status(201).json({ bookingId: 1, message: "Booking created" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
