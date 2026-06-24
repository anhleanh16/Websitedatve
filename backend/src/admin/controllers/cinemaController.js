import * as CinemaModel from "../models/cinemaModel.js";

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

const parseRoomsPayload = (rooms) => {
  if (!rooms) return [];
  if (Array.isArray(rooms)) return rooms;
  if (typeof rooms === "string") {
    try {
      return JSON.parse(rooms);
    } catch (error) {
      throw new Error("Invalid rooms payload");
    }
  }
  return [];
};

// GET /admin/cinemas
export const getAllCinemas = async (req, res) => {
  try {
    const cinemas = await CinemaModel.findAll();
    res.json({ cinemas: cinemas.map(normalizeCinemaImagePath) });
  } catch (error) {
    console.error("Error getting all cinemas:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách rạp phim" });
  }
};

// GET /admin/cinemas/:id
export const getCinemaById = async (req, res) => {
  try {
    const cinema = await CinemaModel.findById(req.params.id);
    if (!cinema) {
      return res.status(404).json({ message: "Không tìm thấy rạp phim" });
    }
    res.json({ cinema: normalizeCinemaImagePath(cinema) });
  } catch (error) {
    console.error(`Error getting cinema by id ${req.params.id}:`, error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy chi tiết rạp phim" });
  }
};

// POST /admin/cinemas
export const createCinema = async (req, res) => {
  try {
    const { cinema_name, address, city, phone, status } = req.body;
    const image = req.file ? `/uploads/cinemas/${req.file.filename}` : null;
    const rooms = parseRoomsPayload(req.body.rooms);

    const newCinemaId = await CinemaModel.create({
      cinema_name,
      address,
      city,
      phone,
      image,
      status,
      rooms,
    });

    const newCinema = await CinemaModel.findById(newCinemaId);
    res.status(201).json({
      message: "Tạo rạp phim thành công",
      cinema: normalizeCinemaImagePath(newCinema),
    });
  } catch (error) {
    console.error("Error creating cinema:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi tạo rạp phim" });
  }
};

// PUT /admin/cinemas/:id
export const updateCinema = async (req, res) => {
  try {
    const { cinema_name, address, city, phone, status } = req.body;
    let image = req.body.image; // Giữ lại ảnh cũ nếu không có ảnh mới
    const rooms = parseRoomsPayload(req.body.rooms);

    if (req.file) {
      image = `/uploads/cinemas/${req.file.filename}`;
    }

    await CinemaModel.update(req.params.id, {
      cinema_name,
      address,
      city,
      phone,
      image,
      status,
      rooms,
    });

    const updatedCinema = await CinemaModel.findById(req.params.id);
    res.json({
      message: "Cập nhật rạp phim thành công",
      cinema: normalizeCinemaImagePath(updatedCinema),
    });
  } catch (error) {
    console.error(`Error updating cinema ${req.params.id}:`, error);
    const statusCode = Number(error?.statusCode) || 500;
    res.status(statusCode).json({
      message:
        statusCode >= 500
          ? "Lỗi máy chủ khi cập nhật rạp phim"
          : error.message || "Không thể cập nhật rạp phim",
    });
  }
};

// DELETE /admin/cinemas/:id
export const deleteCinema = async (req, res) => {
  try {
    await CinemaModel.remove(req.params.id);
    res.json({ message: "Xóa rạp phim thành công" });
  } catch (error) {
    console.error(`Error deleting cinema ${req.params.id}:`, error);
    res.status(500).json({ message: "Lỗi máy chủ khi xóa rạp phim" });
  }
};

// GET /admin/rooms?cinemaId=1
export const getRoomsByCinema = async (req, res) => {
  try {
    const { cinemaId } = req.query;
    if (!cinemaId) {
      return res.status(400).json({ message: "Cinema ID is required" });
    }
    const rooms = await CinemaModel.getRoomsByCinemaId(cinemaId);
    res.json({ rooms });
  } catch (error) {
    console.error("Error getting rooms by cinema:", error);
    res
      .status(500)
      .json({ message: "Lỗi máy chủ khi lấy danh sách phòng chiếu" });
  }
};

// GET /admin/seats?roomId=1
export const getSeatsByRoom = async (req, res) => {
  try {
    const { roomId } = req.query;
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }
    const seats = await CinemaModel.getSeatsByRoomId(roomId);
    res.json({ seats });
  } catch (error) {
    console.error("Error getting seats by room:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi lấy danh sách ghế" });
  }
};

// PUT /admin/seats/bulk { roomId, seatIds, changes: { type?, status? } }
export const bulkUpdateSeats = async (req, res) => {
  try {
    const { roomId, seatIds, changes } = req.body || {};
    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ message: "seatIds is required" });
    }

    const normalizedChanges = {};
    if (changes?.type !== undefined) normalizedChanges.seat_type = changes.type;
    if (changes?.seat_type !== undefined)
      normalizedChanges.seat_type = changes.seat_type;
    if (changes?.status !== undefined)
      normalizedChanges.status = changes.status;

    const allowedTypes = new Set(["Standard", "VIP", "Couple"]);
    const allowedStatuses = new Set(["active", "inactive"]);

    if (
      normalizedChanges.seat_type !== undefined &&
      !allowedTypes.has(normalizedChanges.seat_type)
    ) {
      return res.status(400).json({ message: "Invalid seat_type" });
    }
    if (
      normalizedChanges.status !== undefined &&
      !allowedStatuses.has(normalizedChanges.status)
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const affected = await CinemaModel.updateSeatsBulk(
      roomId,
      seatIds.map(Number).filter((n) => Number.isFinite(n)),
      normalizedChanges,
    );

    res.json({ message: "Updated seats", affected });
  } catch (error) {
    console.error("Error bulk updating seats:", error);
    res.status(500).json({ message: "Lỗi máy chủ khi cập nhật ghế" });
  }
};
