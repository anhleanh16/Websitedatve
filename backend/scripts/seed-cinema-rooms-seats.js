import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'Lunexa',
};

const DEFAULT_ROOM_TEMPLATES = [
  {
    room_name: 'Phòng 2',
    room_type: '3D',
    rows: 8,
    cols: 10,
  },
  {
    room_name: 'Phòng 3',
    room_type: 'IMAX',
    rows: 8,
    cols: 12,
  },
  {
    room_name: 'Phòng 4',
    room_type: 'VIP',
    rows: 10,
    cols: 12,
  },
];

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const buildSeatCode = (rowIndex, colIndex) => {
  const row = alphabet[rowIndex] || `R${rowIndex + 1}`;
  return `${row}${String(colIndex + 1).padStart(2, '0')}`;
};

const createSeatsForRoom = async (connection, roomId, rows, cols) => {
  const [existingSeatRows] = await connection.query(
    'SELECT COUNT(*) AS total FROM Seats WHERE room_id = ?',
    [roomId],
  );

  if (Number(existingSeatRows[0]?.total || 0) > 0) {
    return { created: 0, skipped: true };
  }

  const seatValues = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      seatValues.push([roomId, buildSeatCode(r, c), 'Standard', 'active']);
    }
  }

  if (seatValues.length > 0) {
    await connection.query(
      'INSERT INTO Seats (room_id, seat_code, seat_type, status) VALUES ?',
      [seatValues],
    );
  }

  return { created: seatValues.length, skipped: false };
};

const ensureRoomWithSeats = async (connection, cinemaId, template) => {
  const [existingRooms] = await connection.query(
    'SELECT room_id FROM Rooms WHERE cinema_id = ? AND room_name = ? LIMIT 1',
    [cinemaId, template.room_name],
  );

  const totalSeats = template.rows * template.cols;
  let roomId;
  let roomCreated = false;

  if (existingRooms.length > 0) {
    roomId = existingRooms[0].room_id;
    await connection.query(
      "UPDATE Rooms SET room_type = ?, total_seat = ?, status = 'active' WHERE room_id = ?",
      [template.room_type, totalSeats, roomId],
    );
  } else {
    const [result] = await connection.query(
      "INSERT INTO Rooms (cinema_id, room_name, room_type, total_seat, status) VALUES (?, ?, ?, ?, 'active')",
      [cinemaId, template.room_name, template.room_type, totalSeats],
    );
    roomId = result.insertId;
    roomCreated = true;
  }

  const seatResult = await createSeatsForRoom(
    connection,
    roomId,
    template.rows,
    template.cols,
  );

  return {
    roomId,
    roomName: template.room_name,
    roomType: template.room_type,
    totalSeats,
    roomCreated,
    seatsCreated: seatResult.created,
    seatsSkipped: seatResult.skipped,
  };
};

const main = async () => {
  const connection = await mysql.createConnection(dbConfig);

  try {
    const [cinemas] = await connection.query(
      'SELECT cinemas_id, cinema_name FROM Cinemas ORDER BY cinemas_id',
    );

    if (!cinemas.length) {
      console.log('Không có rạp nào trong hệ thống.');
      return;
    }

    console.log('=== Seed phòng và ghế cho từng rạp ===');

    for (const cinema of cinemas) {
      console.log(`\nRạp: ${cinema.cinema_name} (ID: ${cinema.cinemas_id})`);

      for (const template of DEFAULT_ROOM_TEMPLATES) {
        const result = await ensureRoomWithSeats(
          connection,
          cinema.cinemas_id,
          template,
        );

        const actionText = result.roomCreated ? 'Tạo mới phòng' : 'Đã có phòng';
        const seatText = result.seatsSkipped
          ? 'Ghế đã tồn tại, không tạo lại'
          : `Đã tạo ${result.seatsCreated} ghế`;

        console.log(
          `- ${actionText}: ${result.roomName} (${result.roomType}, ${result.totalSeats} ghế) | ${seatText}`,
        );
      }
    }

    console.log('\nHoàn tất tạo phòng và ghế.');
  } catch (error) {
    console.error('Seed thất bại:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
};

main();
