import { db } from "../../../config/db.js";

const CLEANUP_BUFFER_MINUTES = 15;
const ACTIVE_SHOWTIME_STATUS = "active";
const ENDED_SHOWTIME_STATUS = "ended";
const CANCELLED_SHOWTIME_STATUS = "cancelled";

const SHOWTIME_TEMPLATE_PRESETS = {
  balanced: [
    { hour: 9, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 15, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 21, minute: 0 },
  ],
  premium: [
    { hour: 10, minute: 30 },
    { hour: 13, minute: 30 },
    { hour: 16, minute: 30 },
    { hour: 19, minute: 30 },
    { hour: 22, minute: 30 },
  ],
  weekend: [
    { hour: 8, minute: 30 },
    { hour: 11, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 17, minute: 30 },
    { hour: 20, minute: 30 },
  ],
  compact: [
    { hour: 10, minute: 0 },
    { hour: 13, minute: 30 },
    { hour: 17, minute: 0 },
    { hour: 20, minute: 30 },
  ],
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + Number(days || 0));
  return next;
};

const sortTimeSlots = (slots = []) =>
  [...slots]
    .map((slot) => ({
      hour: Number(slot?.hour ?? 0),
      minute: Number(slot?.minute ?? 0),
    }))
    .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));

const filterSlotsByMovieDuration = (slots, movieDuration) => {
  const normalized = sortTimeSlots(slots);
  const sanitized = [];
  let lastEnd = null;

  for (const slot of normalized) {
    const start = new Date();
    start.setHours(slot.hour, slot.minute, 0, 0);
    const end = addMinutes(start, Number(movieDuration || 0));

    if (lastEnd && start.getTime() < addMinutes(lastEnd, CLEANUP_BUFFER_MINUTES).getTime()) {
      continue;
    }

    sanitized.push(slot);
    lastEnd = end;
  }

  return sanitized;
};

const resolveRecurringDateWindow = ({ movie, startDate, endDate, weeks }) => {
  const releaseDateRaw = movie?.release_date_only || movie?.release_date;
  const releaseDate = releaseDateRaw ? new Date(`${releaseDateRaw}T00:00:00`) : new Date();
  const normalizedStart = startDate ? new Date(`${startDate}T00:00:00`) : new Date(releaseDate);
  const normalizedRelease = new Date(releaseDate);

  const computedStart = normalizedStart < normalizedRelease ? new Date(normalizedRelease) : new Date(normalizedStart);
  const weeksValue = Number(weeks || 0);
  const computedEnd = endDate
    ? new Date(`${endDate}T23:59:59`)
    : addDays(new Date(computedStart), weeksValue > 0 ? weeksValue * 7 - 1 : 6);

  return {
    startDate: computedStart,
    endDate: computedEnd < computedStart ? computedStart : computedEnd,
  };
};

let schemaCapabilitiesPromise = null;

const getSchemaCapabilities = async () => {
  if (schemaCapabilitiesPromise) return schemaCapabilitiesPromise;

  schemaCapabilitiesPromise = (async () => {
    const [showtimeCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Showtimes'",
    );
    const [roomCols] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Rooms'",
    );
    const [campaignTables] = await db.query(
      `SELECT TABLE_NAME
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('Screening_Campaigns', 'Screening_Campaign_Slots')`,
    );

    const showtimeSet = new Set(showtimeCols.map((c) => c.COLUMN_NAME));
    const roomSet = new Set(roomCols.map((c) => c.COLUMN_NAME));
    const campaignTableSet = new Set(
      campaignTables.map((table) => String(table.TABLE_NAME).toLowerCase()),
    );

    return {
      showtimes: {
        hasPriceStandard: showtimeSet.has("price_standard"),
        hasPriceVip: showtimeSet.has("price_vip"),
        hasPriceCouple: showtimeSet.has("price_couple"),
        hasCampaignId: showtimeSet.has("campaign_id"),
        hasIsEarlyShow: showtimeSet.has("is_early_show"),
      },
      rooms: {
        hasStatus: roomSet.has("status"),
      },
      campaigns: {
        hasCampaignsTable: campaignTableSet.has("screening_campaigns"),
        hasSlotsTable: campaignTableSet.has("screening_campaign_slots"),
      },
    };
  })();

  return schemaCapabilitiesPromise;
};

const buildAppError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const buildComputedStatusSql = (statusColumn = "s.status", endTimeColumn = "s.end_time") =>
  `CASE WHEN ${statusColumn} = '${CANCELLED_SHOWTIME_STATUS}' OR ${endTimeColumn} < NOW() THEN '${ENDED_SHOWTIME_STATUS}' ELSE '${ACTIVE_SHOWTIME_STATUS}' END`;

const normalizeStoredShowtimeStatus = (status) =>
  status === CANCELLED_SHOWTIME_STATUS
    ? CANCELLED_SHOWTIME_STATUS
    : ACTIVE_SHOWTIME_STATUS;

const toDate = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (value) => {
  const date = toDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addMinutes = (value, minutes) => {
  const date = toDate(value);
  if (!date) return null;
  date.setMinutes(date.getMinutes() + Number(minutes || 0));
  return date;
};

export const ShowtimeModel = {
  /**
   * Lấy tất cả lịch chiếu, kết hợp thông tin phim, rạp và phòng chiếu.
   * Hỗ trợ filter theo cinemaId và date (YYYY-MM-DD).
   */
  async findAll(filters = {}) {
    const caps = await getSchemaCapabilities();
    const priceStandardExpr = caps.showtimes.hasPriceStandard
      ? "COALESCE(s.price_standard, s.price)"
      : "s.price";
    const priceVipExpr = caps.showtimes.hasPriceVip
      ? "COALESCE(s.price_vip, s.price)"
      : priceStandardExpr;
    const priceCoupleExpr = caps.showtimes.hasPriceCouple
      ? "COALESCE(s.price_couple, s.price)"
      : priceStandardExpr;

    const whereClauses = [];
    const params = [];

    if (filters.cinemaId) {
      whereClauses.push("r.cinema_id = ?");
      params.push(filters.cinemaId);
    }

    if (filters.date) {
      whereClauses.push("DATE(CONVERT_TZ(s.start_time, '+00:00', '+07:00')) = ?");
      params.push(filters.date);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [showtimes] = await db.query(`
      SELECT 
        s.showtime_id,
        s.movie_id,
        s.room_id,
        r.cinema_id,
        s.start_time,
        s.end_time,
        ${priceStandardExpr} AS price_standard,
        ${priceVipExpr} AS price_vip,
        ${priceCoupleExpr} AS price_couple,
        ${priceStandardExpr} AS price,
        s.available_seats,
        ${buildComputedStatusSql()} AS status,
        s.status AS raw_status,
        m.title AS movie_title,
        m.duration,
        c.cinema_name,
        c.cinemas_id AS cinema_id_check,
        r.room_name,
        r.room_type,
        r.total_seat
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      ${whereSQL}
      ORDER BY s.start_time ASC
    `, params);
    return showtimes;
  },

  /**
   * Lấy thông tin chi tiết của một lịch chiếu.
   */
  async findById(id) {
    const caps = await getSchemaCapabilities();
    const priceStandardExpr = caps.showtimes.hasPriceStandard
      ? "COALESCE(s.price_standard, s.price)"
      : "s.price";
    const priceVipExpr = caps.showtimes.hasPriceVip
      ? "COALESCE(s.price_vip, s.price)"
      : priceStandardExpr;
    const priceCoupleExpr = caps.showtimes.hasPriceCouple
      ? "COALESCE(s.price_couple, s.price)"
      : priceStandardExpr;

    const [rows] = await db.query(
      `
      SELECT 
        s.*,
        ${buildComputedStatusSql()} AS computed_status,
        ${priceStandardExpr} AS normalized_price_standard,
        ${priceVipExpr} AS normalized_price_vip,
        ${priceCoupleExpr} AS normalized_price_couple,
        m.title AS movie_title,
        m.duration,
        c.cinema_name,
        r.cinema_id,
        r.room_name,
        r.room_type,
        r.total_seat
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      JOIN Rooms r ON s.room_id = r.room_id
      JOIN Cinemas c ON r.cinema_id = c.cinemas_id
      WHERE s.showtime_id = ?
    `,
      [id],
    );
    return rows[0] || null;
  },

  /**
   * Tạo một lịch chiếu mới.
   */
  async create(showtimeData) {
    const caps = await getSchemaCapabilities();
    let {
      movie_id,
      room_id,
      start_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status = ACTIVE_SHOWTIME_STATUS,
      campaign_id,
      is_early_show = 0,
    } = showtimeData;

    movie_id = Number(movie_id);
    room_id = Number(room_id);
    if (!movie_id || !room_id) {
      throw buildAppError("Thông tin phim hoặc phòng chiếu không hợp lệ.");
    }

    const normalizedStatus = normalizeStoredShowtimeStatus(status);
    const movie = await this.getMovieById(movie_id);
    const room = await this.getRoomById(room_id);
    const normalizedStartTime = toDate(start_time);
    if (!normalizedStartTime) {
      throw buildAppError("Thời gian bắt đầu không hợp lệ.");
    }
    this.ensureStartTimeOnOrAfterReleaseDate(movie, normalizedStartTime);
    const calculatedEndTime = addMinutes(normalizedStartTime, movie.duration);
    await this.ensureRoomScheduleGap({
      roomId: room_id,
      startTime: normalizedStartTime,
      endTime: calculatedEndTime,
    });

    const standardPrice = Number(price_standard ?? price ?? 0) || 0;
    const vipPrice = Number(price_vip ?? standardPrice) || standardPrice;
    const couplePrice = Number(price_couple ?? standardPrice) || standardPrice;
    const seats = Number(available_seats ?? room.total_seat ?? 0);
    const normalizedSeats = Number.isNaN(seats) ? 0 : seats;

    const columns = [
      "movie_id",
      "room_id",
      "start_time",
      "end_time",
      "price",
      "available_seats",
      "status",
    ];
    const params = [
      movie_id,
      room_id,
      normalizedStartTime,
      calculatedEndTime,
      standardPrice,
      normalizedSeats,
      normalizedStatus,
    ];

    if (campaign_id != null) {
      columns.push("campaign_id");
      params.push(Number(campaign_id));
    }
    if (Object.prototype.hasOwnProperty.call(showtimeData, "is_early_show") || Object.prototype.hasOwnProperty.call(showtimeData, "isEarlyShow")) {
      columns.push("is_early_show");
      params.push(Number(Boolean(showtimeData.is_early_show ?? showtimeData.isEarlyShow)));
    }

    if (caps.showtimes.hasPriceStandard) {
      columns.splice(5, 0, "price_standard");
      params.splice(5, 0, standardPrice);
    }
    if (caps.showtimes.hasPriceVip) {
      const insertIndex = columns.indexOf("price") + 1;
      columns.splice(insertIndex, 0, "price_vip");
      params.splice(insertIndex, 0, vipPrice);
    }
    if (caps.showtimes.hasPriceCouple) {
      const insertIndex = columns.indexOf("price") + 1;
      columns.splice(insertIndex, 0, "price_couple");
      params.splice(insertIndex, 0, couplePrice);
    }

    const placeholders = columns.map(() => "?").join(", ");
    const [result] = await db.query(
      `INSERT INTO Showtimes (${columns.join(", ")}) VALUES (${placeholders})`,
      params,
    );
    return result.insertId;
  },

  /**
   * Tạo lịch chiếu lặp lại theo khung giờ cố định trong một khoảng ngày.
   * Bỏ qua (không lỗi) những ngày bị xung đột lịch phòng.
   * @returns {{ created: number[], skipped: Array<{date:string, reason:string}> }}
   */
  async createCampaign({ movieId, campaignType, reason, releaseDate, officialEndDate, earlyShowEnabled, earlyShowDays, earlyShowDurationDays, createdBy = null }) {
    const normalizedType = campaignType || "new_release";
    const normalizedReleaseDate = releaseDate || new Date().toISOString().slice(0, 10);
    const normalizedEndDate = officialEndDate || normalizedReleaseDate;

    const [result] = await db.query(
      `INSERT INTO Screening_Campaigns (
        movie_id,
        campaign_type,
        reason,
        release_date,
        official_end_date,
        early_show_enabled,
        early_show_days,
        early_show_duration_days,
        status,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `,
      [
        Number(movieId),
        normalizedType,
        reason || null,
        normalizedReleaseDate,
        normalizedEndDate,
        Boolean(earlyShowEnabled) ? 1 : 0,
        Number(earlyShowDays || 0),
        Number(earlyShowDurationDays || 0),
        createdBy,
      ],
    );

    return result.insertId;
  },

  async createCampaignSlot({ campaignId, slotType, startDate, endDate, weekdayTemplate, weekendTemplate, defaultPriority, defaultSlotsPerDay }) {
    const [result] = await db.query(
      `INSERT INTO Screening_Campaign_Slots (
        campaign_id,
        slot_type,
        start_date,
        end_date,
        weekday_template,
        weekend_template,
        default_priority,
        default_slots_per_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        Number(campaignId),
        slotType,
        startDate,
        endDate || startDate,
        weekdayTemplate || "balanced",
        weekendTemplate || "weekend",
        Number(defaultPriority || 3),
        Number(defaultSlotsPerDay || 2),
      ],
    );

    return result.insertId;
  },

  async createRecurring(data) {
    const caps = await getSchemaCapabilities();
    const defaultSlots = SHOWTIME_TEMPLATE_PRESETS.balanced;
    const weekdaySlots = Array.isArray(data.weekday_slots)
      ? data.weekday_slots
      : Array.isArray(data.time_slots)
        ? data.time_slots
        : Array.isArray(data.timeSlots)
          ? data.timeSlots
          : defaultSlots;
    const weekendSlots = Array.isArray(data.weekend_slots)
      ? data.weekend_slots
      : weekdaySlots;

    const cinemaIds = Array.isArray(data.cinemas)
      ? data.cinemas
      : Array.isArray(data.cinema_ids)
        ? data.cinema_ids
        : data.cinema_id != null || data.cinemaId != null
          ? [data.cinema_id ?? data.cinemaId]
          : [];
    const roomIdList = Array.isArray(data.room_ids)
      ? data.room_ids
      : data.room_id != null || data.roomId != null
        ? [data.room_id ?? data.roomId]
        : [];

    const movieEntries = Array.isArray(data.movies)
      ? data.movies
      : data.movie_id != null || data.movieId != null
        ? [{
            movie_id: data.movie_id ?? data.movieId,
            priority: data.priority ?? 1,
            slots_per_day: data.slots_per_day ?? data.slotsPerDay ?? 1,
            early_bias: data.early_bias ?? data.earlyBias ?? 0,
          }]
        : [];

    if (!movieEntries.length) {
      throw buildAppError("Cần chọn ít nhất một phim để tạo lịch chiếu.");
    }

    let resolvedCinemaIds = cinemaIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!resolvedCinemaIds.length) {
      const [cinemaRows] = await db.query("SELECT cinemas_id AS cinema_id FROM Cinemas");
      resolvedCinemaIds = cinemaRows.map((row) => Number(row.cinema_id)).filter(Boolean);
    }

    if (!resolvedCinemaIds.length) {
      throw buildAppError("Cần chọn ít nhất một rạp chiếu.");
    }

    const created = [];
    const skipped = [];

    for (const movieEntry of movieEntries) {
      const movieId = Number(movieEntry.movie_id ?? movieEntry.movieId ?? movieEntry.id ?? 0);
      if (!movieId) {
        skipped.push({ reason: "Phim không hợp lệ." });
        continue;
      }

      const movie = await this.getMovieById(movieId);
      if (!movie) {
        skipped.push({ movie_id: movieId, reason: "Không tìm thấy phim." });
        continue;
      }

      const priority = Math.max(1, Number(movieEntry.priority ?? 1));
      const slotsPerDay = Math.max(1, Number(movieEntry.slots_per_day ?? movieEntry.slotsPerDay ?? 1));
      const earlyBias = Math.max(0, Number(movieEntry.early_bias ?? movieEntry.earlyBias ?? 0));
      const campaignType = movieEntry.campaign_type ?? movieEntry.campaignType ?? data.campaign_type ?? data.campaignType ?? "new_release";
      const campaignReason = movieEntry.campaign_reason ?? movieEntry.campaignReason ?? data.campaign_reason ?? data.campaignReason ?? null;
      const releaseDate = movieEntry.release_date ?? movieEntry.releaseDate ?? data.release_date ?? data.releaseDate ?? data.start_date ?? data.startDate ?? movie.release_date_only;
      const officialEndDate = movieEntry.official_end_date ?? movieEntry.officialEndDate ?? data.official_end_date ?? data.officialEndDate ?? data.end_date ?? data.endDate ?? null;
      const earlyEnabled = Boolean(movieEntry.early_show_enabled ?? movieEntry.earlyShowEnabled ?? data.early_show_enabled ?? data.earlyShowEnabled ?? false);
      const earlyShowDays = Math.max(0, Number(movieEntry.early_show_days ?? movieEntry.earlyShowDays ?? data.early_show_days ?? data.earlyShowDays ?? 0));
      const earlyShowDurationDays = Math.max(0, Number(movieEntry.early_show_duration_days ?? movieEntry.earlyShowDurationDays ?? data.early_show_duration_days ?? data.earlyShowDurationDays ?? 0));
      const standardPrice = Number(movieEntry.price_standard ?? movieEntry.priceStandard ?? data.price_standard ?? data.priceStandard ?? data.price ?? 0) || 0;
      const vipPrice = Number(movieEntry.price_vip ?? movieEntry.priceVip ?? data.price_vip ?? data.priceVip ?? standardPrice) || standardPrice;
      const couplePrice = Number(movieEntry.price_couple ?? movieEntry.priceCouple ?? data.price_couple ?? data.priceCouple ?? standardPrice) || standardPrice;
      if (standardPrice <= 0 || vipPrice <= 0 || couplePrice <= 0) {
        throw buildAppError("Giá vé thường, VIP và ghế đôi phải lớn hơn 0.");
      }

      let campaignId = null;
      if (caps.campaigns.hasCampaignsTable) {
        campaignId = await this.createCampaign({
          movieId,
          campaignType,
          reason: campaignReason,
          releaseDate,
          officialEndDate,
          earlyShowEnabled: earlyEnabled,
          earlyShowDays,
          earlyShowDurationDays,
        });
      }

      if (campaignId && caps.campaigns.hasSlotsTable) {
        await this.createCampaignSlot({
          campaignId,
          slotType: "official",
          startDate: releaseDate,
          endDate: officialEndDate || releaseDate,
          weekdayTemplate: data.weekday_template ?? data.weekdayTemplate ?? "balanced",
          weekendTemplate: data.weekend_template ?? data.weekendTemplate ?? "weekend",
          defaultPriority: priority,
          defaultSlotsPerDay: slotsPerDay,
        });

        if (earlyEnabled && earlyShowDays > 0) {
          const earlyStartDate = addDays(new Date(`${releaseDate}T00:00:00`), -earlyShowDays);
          const earlyEndDate = addDays(earlyStartDate, Math.max(1, earlyShowDurationDays) - 1);
          await this.createCampaignSlot({
            campaignId,
            slotType: "early",
            startDate: earlyStartDate.toISOString().slice(0, 10),
            endDate: earlyEndDate.toISOString().slice(0, 10),
            weekdayTemplate: data.weekday_template ?? data.weekdayTemplate ?? "balanced",
            weekendTemplate: data.weekend_template ?? data.weekendTemplate ?? "weekend",
            defaultPriority: priority,
            defaultSlotsPerDay: slotsPerDay,
          });
        }
      }

      const seats = Number(movieEntry.available_seats ?? movieEntry.availableSeats ?? data.available_seats ?? data.availableSeats ?? 0) || 0;
      const normalizedSeats = Number.isNaN(seats) ? 0 : seats;

      const rawTimeSlots = Array.isArray(movieEntry.time_slots) || Array.isArray(movieEntry.timeSlots)
        ? (Array.isArray(movieEntry.time_slots) ? movieEntry.time_slots : movieEntry.timeSlots)
        : weekdaySlots;
      const baseTemplate = rawTimeSlots.length > 0 ? rawTimeSlots : weekdaySlots;
      const normalizedSlots = filterSlotsByMovieDuration(baseTemplate, movie.duration);
      if (!normalizedSlots.length) {
        skipped.push({ movie_id: movieId, reason: "Không có khung giờ phù hợp với thời lượng phim." });
        continue;
      }

      const startDateValue = movieEntry.start_date ?? movieEntry.startDate ?? data.start_date ?? data.startDate ?? data.startDate;
      const endDateValue = movieEntry.end_date ?? movieEntry.endDate ?? data.end_date ?? data.endDate ?? data.endDate;
      const computedWindow = resolveRecurringDateWindow({
        movie,
        startDate: startDateValue,
        endDate: endDateValue,
        weeks: Number(data.weeks ?? 1),
      });

      const startD = new Date(computedWindow.startDate);
      const endD = new Date(computedWindow.endDate);
      if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime()) || startD > endD) {
        skipped.push({ movie_id: movieId, reason: "Khoảng ngày không hợp lệ." });
        continue;
      }

      const dayCursor = new Date(startD);
      while (dayCursor <= endD) {
        const daySlots = dayCursor.getDay() === 0 || dayCursor.getDay() === 6 ? weekendSlots : weekdaySlots;
        const selectedSlots = daySlots.length > 0
          ? daySlots.slice(0, Math.max(1, slotsPerDay + Math.max(0, priority - 2)))
          : normalizedSlots;

        for (const cinemaId of resolvedCinemaIds) {
          const [roomRows] = await db.query(
            `SELECT room_id, total_seat FROM Rooms WHERE cinema_id = ? ${roomIdList.length ? `AND room_id IN (${roomIdList.map(() => "?").join(", ")})` : ""}`,
            roomIdList.length ? [cinemaId, ...roomIdList] : [cinemaId],
          );

          if (!roomRows.length) {
            skipped.push({ movie_id: movieId, cinema_id: cinemaId, date: toDateKey(dayCursor), reason: "Không có phòng chiếu phù hợp trong rạp." });
            continue;
          }

          for (const slot of selectedSlots) {
            const hour = Number(slot.hour ?? 0);
            const minute = Number(slot.minute ?? 0);
            const startTime = new Date(dayCursor);
            startTime.setHours(hour, minute, 0, 0);

            if (earlyBias > 0) {
              const earlyMinutes = Math.min(earlyBias, 120);
              const biasedStart = new Date(startTime);
              biasedStart.setMinutes(startTime.getMinutes() - earlyMinutes);
              if (biasedStart < new Date(dayCursor)) {
                // giữ nguyên nếu lùi quá ngày
              }
            }

            try {
              this.ensureStartTimeOnOrAfterReleaseDate(movie, startTime);
            } catch {
              skipped.push({ movie_id: movieId, cinema_id: cinemaId, date: toDateKey(dayCursor), hour, minute, reason: "Trước ngày phát hành phim." });
              continue;
            }

            let roomAssigned = false;
            for (const roomRow of roomRows) {
              const roomId = Number(roomRow.room_id);
              const endTime = addMinutes(startTime, movie.duration);
              if (!endTime) continue;

              try {
                await this.ensureRoomScheduleGap({ roomId, startTime, endTime });
              } catch {
                continue;
              }

              const roomSeatCount = Number(roomRow.total_seat || 0);
              const roomSeats = roomSeatCount > 0 ? roomSeatCount : normalizedSeats;
              const isEarlySlot = earlyEnabled && earlyShowDays > 0 && startTime < new Date(`${releaseDate}T00:00:00`);
              const columns = ["movie_id", "room_id", "start_time", "end_time", "price", "available_seats", "status"];
              const params = [movieId, roomId, startTime, endTime, standardPrice, roomSeats || 0, ACTIVE_SHOWTIME_STATUS];

              if (caps.showtimes.hasCampaignId && campaignId) {
                columns.push("campaign_id");
                params.push(campaignId);
              }
              if (caps.showtimes.hasIsEarlyShow) {
                columns.push("is_early_show");
                params.push(isEarlySlot ? 1 : 0);
              }

              if (caps.showtimes.hasPriceStandard) {
                columns.splice(5, 0, "price_standard");
                params.splice(5, 0, standardPrice);
              }
              if (caps.showtimes.hasPriceVip) {
                const insertIndex = columns.indexOf("price") + 1;
                columns.splice(insertIndex, 0, "price_vip");
                params.splice(insertIndex, 0, vipPrice);
              }
              if (caps.showtimes.hasPriceCouple) {
                const insertIndex = columns.indexOf("price") + 1;
                columns.splice(insertIndex, 0, "price_couple");
                params.splice(insertIndex, 0, couplePrice);
              }

              const placeholders = columns.map(() => "?").join(", ");
              const [result] = await db.query(
                `INSERT INTO Showtimes (${columns.join(", ")}) VALUES (${placeholders})`,
                params,
              );
              created.push(result.insertId);
              roomAssigned = true;
              break;
            }

            if (!roomAssigned) {
              skipped.push({ movie_id: movieId, cinema_id: cinemaId, date: toDateKey(dayCursor), hour, minute, reason: "Không còn phòng phù hợp trong khung giờ này." });
            }
          }
        }

        const nextDate = new Date(dayCursor);
        nextDate.setDate(dayCursor.getDate() + 1);
        dayCursor.setTime(nextDate.getTime());
      }
    }

    return { created, skipped };
  },

  /**
   * Cập nhật một lịch chiếu.
   */
  async update(id, showtimeData) {
    const caps = await getSchemaCapabilities();
    let {
      movie_id,
      room_id,
      start_time,
      price_standard,
      price_vip,
      price_couple,
      price,
      available_seats,
      status,
    } = showtimeData;

    movie_id = Number(movie_id);
    room_id = Number(room_id);
    if (!movie_id || !room_id) {
      throw buildAppError("Thông tin phim hoặc phòng chiếu không hợp lệ.");
    }

    const normalizedStatus = normalizeStoredShowtimeStatus(status);
    const movie = await this.getMovieById(movie_id);
    const room = await this.getRoomById(room_id);
    const normalizedStartTime = toDate(start_time);
    if (!normalizedStartTime) {
      throw buildAppError("Thời gian bắt đầu không hợp lệ.");
    }
    this.ensureStartTimeOnOrAfterReleaseDate(movie, normalizedStartTime);
    const calculatedEndTime = addMinutes(normalizedStartTime, movie.duration);
    await this.ensureRoomScheduleGap({
      roomId: room_id,
      startTime: normalizedStartTime,
      endTime: calculatedEndTime,
      excludeShowtimeId: id,
    });
    const standardPrice = Number(price_standard ?? price ?? 0) || 0;
    const vipPrice = Number(price_vip ?? standardPrice) || standardPrice;
    const couplePrice = Number(price_couple ?? standardPrice) || standardPrice;
    const seats = Number(available_seats ?? room.total_seat ?? 0);
    const normalizedSeats = Number.isNaN(seats) ? 0 : seats;
    const setClauses = [
      "movie_id = ?",
      "room_id = ?",
      "start_time = ?",
      "end_time = ?",
      "price = ?",
      "available_seats = ?",
      "status = ?",
    ];
    const params = [
      movie_id,
      room_id,
      normalizedStartTime,
      calculatedEndTime,
      standardPrice,
      normalizedSeats,
      normalizedStatus,
    ];

    if (caps.showtimes.hasPriceStandard) {
      setClauses.splice(5, 0, "price_standard = ?");
      params.splice(5, 0, standardPrice);
    }
    if (caps.showtimes.hasPriceVip) {
      const insertIndex = setClauses.indexOf("price = ?") + 1;
      setClauses.splice(insertIndex, 0, "price_vip = ?");
      params.splice(insertIndex, 0, vipPrice);
    }
    if (caps.showtimes.hasPriceCouple) {
      const insertIndex = setClauses.indexOf("price = ?") + 1;
      setClauses.splice(insertIndex, 0, "price_couple = ?");
      params.splice(insertIndex, 0, couplePrice);
    }

    params.push(id);
    const [result] = await db.query(
      `UPDATE Showtimes SET ${setClauses.join(", ")} WHERE showtime_id = ?`,
      params,
    );
    return result.affectedRows > 0;
  },

  /**
   * Xóa một lịch chiếu.
   */
  async delete(id) {
    // Cảnh báo: Chỉ nên xóa lịch chiếu chưa có ai đặt vé.
    const [[showtime]] = await db.query(
      "SELECT end_time, status FROM Showtimes WHERE showtime_id = ?",
      [id],
    );
    if (!showtime) return false;

    const hasEnded = showtime.status === CANCELLED_SHOWTIME_STATUS
      || (toDate(showtime.end_time)?.getTime() ?? 0) < Date.now();
    if (hasEnded) {
      throw buildAppError("Lịch chiếu đã kết thúc không thể xóa.");
    }

    const [result] = await db.query(
      "DELETE FROM Showtimes WHERE showtime_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Hủy một lịch chiếu (cập nhật trạng thái).
   */
  async cancel(id) {
    const [result] = await db.query(
      "UPDATE Showtimes SET status = 'cancelled' WHERE showtime_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  /**
   * Lấy danh sách các rạp chiếu phim.
   */
  async getCinemas() {
    const [cinemas] = await db.query(
      "SELECT cinemas_id AS cinema_id, cinema_name FROM Cinemas ORDER BY cinema_name ASC",
    );
    return cinemas;
  },

  /**
   * Lấy danh sách phòng chiếu thuộc một rạp cụ thể.
   */
  async getRoomsByCinema(cinemaId) {
    const caps = await getSchemaCapabilities();
    const selectColumns = caps.rooms.hasStatus
      ? "room_id, cinema_id, room_name, room_type, total_seat, status"
      : "room_id, cinema_id, room_name, room_type, total_seat";
    const whereStatus = caps.rooms.hasStatus ? " AND status = 'active'" : "";

    const sql = cinemaId
      ? `SELECT ${selectColumns} FROM Rooms WHERE cinema_id = ?${whereStatus} ORDER BY room_name ASC`
      : `SELECT ${selectColumns} FROM Rooms WHERE 1=1${whereStatus} ORDER BY room_name ASC`;
    const [rooms] = await db.query(sql, cinemaId ? [cinemaId] : []);
    return rooms;
  },

  async getMovieById(movieId) {
    const [[movie]] = await db.query(
      "SELECT movie_id, title, duration, DATE_FORMAT(release_date, '%Y-%m-%d') AS release_date_only FROM Movies WHERE movie_id = ?",
      [movieId],
    );
    if (!movie) {
      throw buildAppError("Không tìm thấy phim để tạo lịch chiếu.", 404);
    }
    const duration = Number(movie.duration || 0);
    if (duration <= 0) {
      throw buildAppError(
        `Phim "${movie.title}" chưa có thời lượng hợp lệ để xếp lịch chiếu.`,
      );
    }
    return {
      ...movie,
      duration,
    };
  },

  ensureStartTimeOnOrAfterReleaseDate(movie, startTime) {
    const releaseDate = String(movie?.release_date_only || "");
    const startDate = toDateKey(startTime);
    if (!releaseDate || !startDate) return;
    if (startDate < releaseDate) {
      throw buildAppError(
        `Phim "${movie.title}" chỉ được xếp lịch chiếu từ ngày phát hành ${releaseDate} trở đi.`,
      );
    }
  },

  async getRoomById(roomId) {
    const [[room]] = await db.query(
      "SELECT room_id, room_name, total_seat FROM Rooms WHERE room_id = ?",
      [roomId],
    );
    if (!room) {
      throw buildAppError("Không tìm thấy phòng chiếu.", 404);
    }
    return room;
  },

  async ensureRoomScheduleGap({
    roomId,
    startTime,
    endTime,
    excludeShowtimeId = null,
  }) {
    const normalizedStartTime = toDate(startTime);
    const normalizedEndTime = toDate(endTime);
    if (!normalizedStartTime || !normalizedEndTime) {
      throw buildAppError("Không thể tính thời gian chiếu hợp lệ.");
    }

    const endTimeWithCleanup = addMinutes(
      normalizedEndTime,
      CLEANUP_BUFFER_MINUTES,
    );
    const params = [
      roomId,
      endTimeWithCleanup,
      normalizedStartTime,
    ];
    let excludeClause = "";

    if (excludeShowtimeId) {
      excludeClause = "AND s.showtime_id <> ?";
      params.push(excludeShowtimeId);
    }

    const [conflicts] = await db.query(
      `
      SELECT
        s.showtime_id,
        s.start_time,
        s.end_time,
        m.title AS movie_title
      FROM Showtimes s
      JOIN Movies m ON s.movie_id = m.movie_id
      WHERE s.room_id = ?
        AND s.status <> 'cancelled'
        AND s.start_time < ?
        AND DATE_ADD(s.end_time, INTERVAL ${CLEANUP_BUFFER_MINUTES} MINUTE) > ?
        ${excludeClause}
      ORDER BY s.start_time ASC
      `,
      params,
    );

    if (conflicts.length === 0) return;

    const conflictText = conflicts
      .map((showtime) => {
        const startLabel = toDate(showtime.start_time)?.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const endLabel = toDate(showtime.end_time)?.toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        return `${showtime.movie_title} (${startLabel} - ${endLabel})`;
      })
      .join(", ");

    throw buildAppError(
      `Không thể tạo suất chiếu này! Phòng đã có lịch trùng khung giờ hoặc chưa đủ thời gian dọn dẹp (${CLEANUP_BUFFER_MINUTES} phút). Xung đột với: ${conflictText}.`,
    );
  },
};
