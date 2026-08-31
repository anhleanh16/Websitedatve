import { ShowtimeModel } from "../models/showtimeModel.js";

const DEBUG_SERVER_URL = "http://127.0.0.1:7777/event";
const DEBUG_SESSION_ID = "admin-showtimes-500";
const DEBUG_RUN_ID = "post-fix";

const reportDebugEvent = (payload) => {
  try {
    if (typeof fetch !== "function") return;
    fetch(DEBUG_SERVER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: DEBUG_RUN_ID,
        ts: Date.now(),
        ...payload,
      }),
    }).catch(() => {});
  } catch {}
};

const normalizeShowtimePayload = (body = {}) => ({
  movie_id: body.movie_id ?? body.movieId,
  room_id: body.room_id ?? body.roomId,
  start_time: body.start_time ?? body.startTime,
  end_time: body.end_time ?? body.endTime,
  price_standard: body.price_standard ?? body.priceStandard ?? body.price,
  price_vip: body.price_vip ?? body.priceVip ?? body.price,
  price_couple: body.price_couple ?? body.priceCouple ?? body.price,
  price: body.price ?? body.priceStandard ?? body.price_standard,
  available_seats: body.available_seats ?? body.availableSeats,
  status: body.status,
});

const buildShowtimePayloadError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const getShowtimes = async (req, res) => {
  try {
    reportDebugEvent({
      hypothesisId: "A",
      location: "showtimeController.js:getShowtimes",
      msg: "[DEBUG] getShowtimes entry",
    });
    const { cinemaId, date } = req.query;
    const filters = {};
    if (cinemaId) filters.cinemaId = cinemaId;
    if (date) filters.date = date;
    const showtimes = await ShowtimeModel.findAll(filters);
    res.json({ showtimes });
  } catch (err) {
    console.error("Error in getShowtimes:", err);
    // #region debug-point A:getShowtimes-error
    reportDebugEvent({
      hypothesisId: "A",
      location: "showtimeController.js:getShowtimes",
      msg: "[DEBUG] getShowtimes error",
      data: {
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        sqlMessage: err?.sqlMessage,
        sql: err?.sql,
      },
    });
    // #endregion
    res.status(500).json({ message: "Error getting showtimes" });
  }
};

export const getShowtimeById = async (req, res) => {
  try {
    const { id } = req.params;
    const showtime = await ShowtimeModel.findById(id);
    if (showtime) {
      res.json(showtime);
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    console.error("Error in getShowtimeById:", err);
    res.status(500).json({ message: "Error getting showtime details" });
  }
};

export const createRecurringShowtime = async (req, res) => {
  try {
    const {
      movie_id, movieId,
      room_id, roomId,
      time_slots, timeSlots,
      weekday_slots, weekend_slots,
      start_date, startDate,
      end_date, endDate,
      release_date, releaseDate,
      official_end_date, officialEndDate,
      campaign_type, campaignType,
      campaign_reason, campaignReason,
      early_show_enabled, earlyShowEnabled,
      early_show_days, earlyShowDays,
      early_show_duration_days, earlyShowDurationDays,
      price_standard, priceStandard,
      price_vip, priceVip,
      price_couple, priceCouple,
      price,
      available_seats, availableSeats,
      movies,
      cinemas,
      cinema_ids,
      room_ids,
      priority,
      slots_per_day,
      slotsPerDay,
      early_bias,
      earlyBias,
    } = req.body;

    const result = await ShowtimeModel.createRecurring({
      movie_id:       movie_id ?? movieId,
      room_id:        room_id  ?? roomId,
      time_slots:     time_slots ?? timeSlots,
      weekday_slots:  weekday_slots ?? time_slots ?? timeSlots,
      weekend_slots:  weekend_slots ?? weekday_slots ?? time_slots ?? timeSlots,
      start_date:     start_date ?? startDate ?? release_date ?? releaseDate,
      end_date:       end_date   ?? endDate ?? official_end_date ?? officialEndDate,
      release_date:   release_date ?? releaseDate ?? start_date ?? startDate,
      official_end_date: official_end_date ?? officialEndDate ?? end_date ?? endDate,
      campaign_type: campaign_type ?? campaignType ?? "new_release",
      campaign_reason: campaign_reason ?? campaignReason,
      early_show_enabled: early_show_enabled ?? earlyShowEnabled ?? false,
      early_show_days: early_show_days ?? earlyShowDays ?? 0,
      early_show_duration_days: early_show_duration_days ?? earlyShowDurationDays ?? 0,
      price_standard: price_standard ?? priceStandard ?? price,
      price_vip:      price_vip      ?? priceVip      ?? price,
      price_couple:   price_couple   ?? priceCouple   ?? price,
      price,
      available_seats: available_seats ?? availableSeats,
      movies,
      cinemas: cinemas ?? cinema_ids,
      room_ids: room_ids ?? (room_id != null || roomId != null ? [room_id ?? roomId] : []),
      priority,
      slots_per_day: slots_per_day ?? slotsPerDay,
      early_bias: early_bias ?? earlyBias,
    });

    if (result.created.length === 0) {
      const reasons = (result.skipped || [])
        .slice(0, 3)
        .map((item) => item.reason)
        .filter(Boolean);
      const reasonText = reasons.length
        ? ` Lý do thường gặp: ${reasons.join(" | ")}`
        : "";

      return res.status(400).json({
        message: `Không tạo được suất chiếu nào trong khoảng đã chọn.${reasonText}`,
        created: result.created,
        skipped: result.skipped,
      });
    }

    res.status(201).json({
      message: `Đã tạo ${result.created.length} suất chiếu. Bỏ qua ${result.skipped.length} suất bị xung đột.`,
      created: result.created,
      skipped: result.skipped,
    });
  } catch (err) {
    console.error("Error in createRecurringShowtime:", err);
    const statusCode = Number(err?.statusCode) || 500;
    res.status(statusCode).json({
      message: statusCode >= 500 ? "Failed to create recurring showtimes" : err.message,
    });
  }
};

export const createShowtime = async (req, res) => {
  try {
    const payload = normalizeShowtimePayload(req.body);
    if (!payload.movie_id || !payload.room_id || !payload.start_time) {
      throw buildShowtimePayloadError(
        "Thiếu thông tin phim, phòng hoặc giờ bắt đầu.",
      );
    }

    const showtimeId = await ShowtimeModel.create(payload);
    res
      .status(201)
      .json({ message: "Showtime created successfully", showtimeId });
  } catch (err) {
    console.error("Error in createShowtime:", err);
    const statusCode = Number(err?.statusCode) || 500;
    res.status(statusCode).json({
      message: statusCode >= 500 ? "Failed to create showtime" : err.message,
    });
  }
};

export const updateShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = normalizeShowtimePayload(req.body);
    if (!payload.movie_id || !payload.room_id || !payload.start_time) {
      throw buildShowtimePayloadError(
        "Thiếu thông tin phim, phòng hoặc giờ bắt đầu.",
      );
    }
    const success = await ShowtimeModel.update(id, payload);
    if (success) {
      res.json({ message: "Showtime updated successfully" });
    } else {
      res
        .status(404)
        .json({ message: "Showtime not found or no changes made" });
    }
  } catch (err) {
    console.error("Error in updateShowtime:", err);
    const statusCode = Number(err?.statusCode) || 500;
    res.status(statusCode).json({
      message: statusCode >= 500 ? "Failed to update showtime" : err.message,
    });
  }
};

export const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await ShowtimeModel.delete(id);
    if (success) {
      res.json({ message: "Showtime deleted successfully" });
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(400)
        .json({
          message: "Cannot delete showtime. It has associated bookings.",
        });
    }
    console.error("Error in deleteShowtime:", err);
    res.status(500).json({ message: "Failed to delete showtime" });
  }
};

export const cancelShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    // Thêm logic kiểm tra và xử lý hoàn vé cho các booking liên quan ở đây
    const success = await ShowtimeModel.cancel(id);
    if (success) {
      res.json({ message: "Showtime cancelled successfully" });
    } else {
      res.status(404).json({ message: "Showtime not found" });
    }
  } catch (err) {
    console.error("Error in cancelShowtime:", err);
    res.status(500).json({ message: "Failed to cancel showtime" });
  }
};

// --- Helper functions for UI ---
export const getShowtimeCinemas = async (req, res) => {
  try {
    const cinemas = await ShowtimeModel.getCinemas();
    res.json({ cinemas });
  } catch (err) {
    console.error("Error in getShowtimeCinemas:", err);
    res.status(500).json({ message: "Error getting cinemas" });
  }
};

export const getShowtimeRooms = async (req, res) => {
  try {
    const { cinemaId } = req.query;
    // #region debug-point B:getShowtimeRooms-entry
    reportDebugEvent({
      hypothesisId: "B",
      location: "showtimeController.js:getShowtimeRooms",
      msg: "[DEBUG] getShowtimeRooms entry",
      data: { cinemaId },
    });
    // #endregion
    const rooms = await ShowtimeModel.getRoomsByCinema(cinemaId);
    res.json({ rooms });
  } catch (err) {
    console.error("Error in getShowtimeRooms:", err);
    // #region debug-point B:getShowtimeRooms-error
    reportDebugEvent({
      hypothesisId: "B",
      location: "showtimeController.js:getShowtimeRooms",
      msg: "[DEBUG] getShowtimeRooms error",
      data: {
        cinemaId: req?.query?.cinemaId,
        message: err?.message,
        code: err?.code,
        errno: err?.errno,
        sqlState: err?.sqlState,
        sqlMessage: err?.sqlMessage,
        sql: err?.sql,
      },
    });
    // #endregion
    res.status(500).json({ message: "Error getting rooms" });
  }
};
