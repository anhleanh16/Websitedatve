import { db } from "../../../config/db.js";

const DEFAULT_SEAT_STATUS = "active";
let ensureRoomSeatGapsTablePromise;
const ALLOWED_ROOM_STATUSES = new Set(["active", "inactive", "maintenance"]);

const calcTotalSeats = (seatRows = []) =>
  (seatRows || []).reduce(
    (sum, row) => sum + Number(row?.seatsPerRow || row?.totalSeats || 0),
    0,
  );

const buildSeatCode = (rowName, seatNumber) =>
  `${String(rowName || "")
    .trim()
    .toUpperCase()}${seatNumber}`;

const normalizeRoomStatus = (status, totalSeat) => {
  if (Number(totalSeat || 0) <= 0) return "maintenance";
  return ALLOWED_ROOM_STATUSES.has(status) ? status : "active";
};

const ensureRoomSeatGapsTable = async () => {
  if (!ensureRoomSeatGapsTablePromise) {
    ensureRoomSeatGapsTablePromise = db.query(`
      CREATE TABLE IF NOT EXISTS RoomSeatGaps (
        seat_gap_id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        gap_from INT NOT NULL,
        gap_to INT NOT NULL,
        sort_order INT DEFAULT 0,
        CONSTRAINT fk_room_seat_gaps_room
          FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
          ON DELETE CASCADE
      )
    `);
  }

  return ensureRoomSeatGapsTablePromise;
};

const normalizeRoomSeatGaps = (room = {}) =>
  (Array.isArray(room.seatGaps)
    ? room.seatGaps
    : Array.isArray(room.seat_gaps)
      ? room.seat_gaps
      : []
  )
    .map((gap, index) => {
      const gapFrom = Number(gap?.from ?? gap?.gap_from ?? 0) || 0;
      const gapTo = Number(gap?.to ?? gap?.gap_to ?? 0) || 0;

      if (gapFrom <= 0 || gapTo <= gapFrom) return null;

      return {
        gap_from: gapFrom,
        gap_to: gapTo,
        sort_order: Number(gap?.sort_order ?? index) || index,
      };
    })
    .filter(Boolean);

const buildDesiredSeats = (room = {}, existingSeats = []) => {
  const existingByCode = new Map(
    existingSeats.map((seat) => [seat.seat_code, seat]),
  );

  if (Array.isArray(room.seats) && room.seats.length > 0) {
    return room.seats
      .map((seat) => {
        const seatCode = String(seat.seat_code || seat.code || "").trim();
        if (!seatCode) return null;
        const existingSeat = existingByCode.get(seatCode);
        return {
          seat_code: seatCode,
          seat_type: seat.seat_type || seat.type || "Standard",
          status:
            seat.status || existingSeat?.status || DEFAULT_SEAT_STATUS,
        };
      })
      .filter(Boolean);
  }

  if (!Array.isArray(room.seatRows)) {
    return [];
  }

  return room.seatRows.flatMap((row) => {
    const rowName = String(row.rowName || row.row_name || "")
      .trim()
      .toUpperCase();
    const seatsPerRow = Number(row.seatsPerRow || row.totalSeats || 0);
    const startSeatNumber = Math.max(
      1,
      Number(row.startSeatNumber || row.startSeat || 1) || 1,
    );

    if (!rowName || seatsPerRow <= 0) {
      return [];
    }

    return Array.from({ length: seatsPerRow }, (_, index) => {
      const seatCode = buildSeatCode(rowName, startSeatNumber + index);
      const existingSeat = existingByCode.get(seatCode);

      return {
        seat_code: seatCode,
        seat_type: row.seatType || row.seat_type || "Standard",
        status: existingSeat?.status || DEFAULT_SEAT_STATUS,
      };
    });
  });
};

const attachNestedData = async (cinemas) => {
  if (!Array.isArray(cinemas) || cinemas.length === 0) {
    return [];
  }

  await ensureRoomSeatGapsTable();

  const cinemaIds = cinemas.map((cinema) => cinema.cinemas_id);
  const roomPlaceholders = cinemaIds.map(() => "?").join(",");
  const [rooms] = await db.query(
    `SELECT * FROM Rooms WHERE cinema_id IN (${roomPlaceholders}) ORDER BY room_id ASC`,
    cinemaIds,
  );

  const roomsByCinemaId = new Map(cinemaIds.map((id) => [id, []]));
  rooms.forEach((room) => {
    roomsByCinemaId.get(room.cinema_id)?.push({ ...room, seats: [] });
  });

  if (rooms.length > 0) {
    const roomIds = rooms.map((room) => room.room_id);
    const seatPlaceholders = roomIds.map(() => "?").join(",");
    const [seats] = await db.query(
      `SELECT * FROM Seats WHERE room_id IN (${seatPlaceholders}) ORDER BY seat_code ASC`,
      roomIds,
    );

    const roomMap = new Map(
      rooms.map((room) => [
        room.room_id,
        roomsByCinemaId
          .get(room.cinema_id)
          ?.find((item) => item.room_id === room.room_id),
      ]),
    );

    seats.forEach((seat) => {
      roomMap.get(seat.room_id)?.seats.push(seat);
    });

    const gapPlaceholders = roomIds.map(() => "?").join(",");
    const [seatGaps] = await db.query(
      `SELECT seat_gap_id, room_id, gap_from, gap_to, sort_order
       FROM RoomSeatGaps
       WHERE room_id IN (${gapPlaceholders})
       ORDER BY room_id ASC, sort_order ASC, seat_gap_id ASC`,
      roomIds,
    );

    seatGaps.forEach((gap) => {
      const room = roomMap.get(gap.room_id);
      if (!room) return;
      if (!Array.isArray(room.seat_gaps)) room.seat_gaps = [];
      room.seat_gaps.push(gap);
    });
  }

  return cinemas.map((cinema) => ({
    ...cinema,
    rooms: roomsByCinemaId.get(cinema.cinemas_id) || [],
  }));
};

const syncRoomSeatGaps = async (connection, roomId, roomData) => {
  await ensureRoomSeatGapsTable();

  await connection.query("DELETE FROM RoomSeatGaps WHERE room_id = ?", [roomId]);

  const seatGaps = normalizeRoomSeatGaps(roomData);
  for (const gap of seatGaps) {
    await connection.query(
      "INSERT INTO RoomSeatGaps (room_id, gap_from, gap_to, sort_order) VALUES (?, ?, ?, ?)",
      [roomId, gap.gap_from, gap.gap_to, gap.sort_order],
    );
  }
};

const syncSeats = async (connection, roomId, roomData) => {
  const [existingSeats] = await connection.query(
    "SELECT seat_id, room_id, seat_code, seat_type, status FROM Seats WHERE room_id = ?",
    [roomId],
  );

  const desiredSeats = buildDesiredSeats(roomData, existingSeats);
  const desiredCodes = new Set(desiredSeats.map((seat) => seat.seat_code));
  const existingByCode = new Map(
    existingSeats.map((seat) => [seat.seat_code, seat]),
  );

  for (const seat of desiredSeats) {
    const existingSeat = existingByCode.get(seat.seat_code);

    if (existingSeat) {
      await connection.query(
        "UPDATE Seats SET seat_type = ?, status = ? WHERE seat_id = ?",
        [seat.seat_type, seat.status, existingSeat.seat_id],
      );
      continue;
    }

    await connection.query(
      "INSERT INTO Seats (room_id, seat_code, seat_type, status) VALUES (?, ?, ?, ?)",
      [roomId, seat.seat_code, seat.seat_type, seat.status],
    );
  }

  const seatsToDelete = existingSeats.filter(
    (seat) => !desiredCodes.has(seat.seat_code),
  );

  if (seatsToDelete.length > 0) {
    const placeholders = seatsToDelete.map(() => "?").join(",");
    await connection.query(
      `DELETE FROM Seats WHERE room_id = ? AND seat_id IN (${placeholders})`,
      [roomId, ...seatsToDelete.map((seat) => seat.seat_id)],
    );
  }
};

const syncRooms = async (connection, cinemaId, rooms = []) => {
  const [existingRooms] = await connection.query(
    "SELECT room_id FROM Rooms WHERE cinema_id = ?",
    [cinemaId],
  );
  const existingRoomIds = new Set(existingRooms.map((room) => room.room_id));
  const keptRoomIds = new Set();

  for (const room of rooms || []) {
    const roomId = Number(room.room_id || room.id);
    const roomName = String(room.room_name || room.name || "").trim();
    const roomType = room.room_type || room.type || "2D";
    const totalSeat = Number(
      room.total_seat ||
        room.totalSeats ||
        (Array.isArray(room.seats) ? room.seats.length : 0) ||
        calcTotalSeats(room.seatRows),
    );
    const roomStatus = normalizeRoomStatus(
      room.status || room.room_status,
      totalSeat,
    );

    let currentRoomId = roomId;

    if (roomId && existingRoomIds.has(roomId)) {
      await connection.query(
        "UPDATE Rooms SET room_name = ?, room_type = ?, total_seat = ?, status = ? WHERE room_id = ? AND cinema_id = ?",
        [roomName, roomType, totalSeat, roomStatus, roomId, cinemaId],
      );
    } else {
      const [result] = await connection.query(
        "INSERT INTO Rooms (cinema_id, room_name, room_type, total_seat, status) VALUES (?, ?, ?, ?, ?)",
        [cinemaId, roomName, roomType, totalSeat, roomStatus],
      );
      currentRoomId = result.insertId;
    }

    keptRoomIds.add(currentRoomId);
    await syncSeats(connection, currentRoomId, room);
    await syncRoomSeatGaps(connection, currentRoomId, room);
  }

  const roomsToDelete = existingRooms.filter(
    (room) => !keptRoomIds.has(room.room_id),
  );

  for (const room of roomsToDelete) {
    await connection.query("DELETE FROM RoomSeatGaps WHERE room_id = ?", [
      room.room_id,
    ]);
    await connection.query("DELETE FROM Seats WHERE room_id = ?", [room.room_id]);
    await connection.query("DELETE FROM Rooms WHERE room_id = ?", [room.room_id]);
  }
};

// Lấy tất cả rạp phim
export const findAll = async () => {
  await ensureRoomSeatGapsTable();
  const [cinemas] = await db.query(
    "SELECT * FROM Cinemas ORDER BY cinemas_id DESC",
  );
  return attachNestedData(cinemas);
};

// Lấy một rạp phim theo ID, bao gồm cả phòng và ghế
export const findById = async (id) => {
  await ensureRoomSeatGapsTable();
  const [[cinema]] = await db.query(
    "SELECT * FROM Cinemas WHERE cinemas_id = ?",
    [id],
  );
  if (!cinema) return null;

  const [cinemaWithRooms] = await attachNestedData([cinema]);
  return cinemaWithRooms || null;
};

// Tạo rạp phim mới
export const create = async (cinemaData) => {
  const connection = await db.getConnection();

  try {
    await ensureRoomSeatGapsTable();
    await connection.beginTransaction();

    const { cinema_name, address, city, phone, image, rooms = [] } = cinemaData;
    const [result] = await connection.query(
      "INSERT INTO Cinemas (cinema_name, address, city, phone, image) VALUES (?, ?, ?, ?, ?)",
      [cinema_name, address, city, phone, image],
    );

    await syncRooms(connection, result.insertId, rooms);
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Cập nhật thông tin rạp phim
export const update = async (id, cinemaData) => {
  const connection = await db.getConnection();

  try {
    await ensureRoomSeatGapsTable();
    await connection.beginTransaction();

    const { cinema_name, address, city, phone, image, rooms = [] } = cinemaData;
    const [result] = await connection.query(
      "UPDATE Cinemas SET cinema_name = ?, address = ?, city = ?, phone = ?, image = ? WHERE cinemas_id = ?",
      [cinema_name, address, city, phone, image, id],
    );

    await syncRooms(connection, id, rooms);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Xóa rạp phim
export const remove = async (id) => {
  const connection = await db.getConnection();

  try {
    await ensureRoomSeatGapsTable();
    await connection.beginTransaction();

    const [rooms] = await connection.query(
      "SELECT room_id FROM Rooms WHERE cinema_id = ?",
      [id],
    );

    for (const room of rooms) {
      await connection.query("DELETE FROM RoomSeatGaps WHERE room_id = ?", [
        room.room_id,
      ]);
      await connection.query("DELETE FROM Seats WHERE room_id = ?", [room.room_id]);
    }

    await connection.query("DELETE FROM Rooms WHERE cinema_id = ?", [id]);
    const [result] = await connection.query(
      "DELETE FROM Cinemas WHERE cinemas_id = ?",
      [id],
    );

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getRoomsByCinemaId = async (cinemaId) => {
  const [rooms] = await db.query(
    "SELECT room_id, cinema_id, room_name, room_type, total_seat, status FROM Rooms WHERE cinema_id = ? ORDER BY room_id DESC",
    [cinemaId],
  );
  return rooms;
};

export const getSeatsByRoomId = async (roomId) => {
  const [seats] = await db.query(
    "SELECT seat_id, room_id, seat_code, seat_type, status FROM Seats WHERE room_id = ? ORDER BY seat_code",
    [roomId],
  );
  return seats;
};

export const updateSeatsBulk = async (roomId, seatIds, changes) => {
  const hasType = changes.seat_type !== undefined;
  const hasStatus = changes.status !== undefined;
  if (!hasType && !hasStatus) return 0;
  if (!Array.isArray(seatIds) || seatIds.length === 0) return 0;

  const setParts = [];
  const params = [];
  if (hasType) {
    setParts.push("seat_type = ?");
    params.push(changes.seat_type);
  }
  if (hasStatus) {
    setParts.push("status = ?");
    params.push(changes.status);
  }

  const placeholders = seatIds.map(() => "?").join(",");
  params.push(roomId, ...seatIds);

  const [result] = await db.query(
    `UPDATE Seats SET ${setParts.join(", ")} WHERE room_id = ? AND seat_id IN (${placeholders})`,
    params,
  );

  return result.affectedRows || 0;
};
