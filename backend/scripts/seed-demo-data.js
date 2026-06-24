/**
 * Chạy: node scripts/seed-demo-data.js
 * Thêm 20 phim demo và 6 phòng demo cho mỗi rạp hiện có.
 */
import { db } from "../config/db.js";

const DEMO_MOVIES = [
  {
    title: "Oppenheimer",
    description:
      "Phim tiểu sử về J. Robert Oppenheimer và quá trình phát triển bom nguyên tử.",
    duration: 180,
    age_limit: 16,
    director: "Christopher Nolan",
    actors: "Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.",
    trailer: "https://www.youtube.com/watch?v=uYPbbksJxIg",
    release_date: "2023-07-21",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Dune: Part Two",
    description:
      "Paul Atreides hợp lực với Fremen để trả thù và thay đổi vận mệnh Arrakis.",
    duration: 166,
    age_limit: 13,
    director: "Denis Villeneuve",
    actors: "Timothee Chalamet, Zendaya, Rebecca Ferguson, Austin Butler",
    trailer: "https://www.youtube.com/watch?v=Way9Dexny3w",
    release_date: "2024-03-01",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Inside Out 2",
    description:
      "Riley bước vào tuổi teen với hàng loạt cảm xúc mới xuất hiện trong tâm trí.",
    duration: 96,
    age_limit: 0,
    director: "Kelsey Mann",
    actors: "Amy Poehler, Maya Hawke, Kensington Tallman",
    trailer: "https://www.youtube.com/watch?v=LEjhY15eCx0",
    release_date: "2024-06-14",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Deadpool & Wolverine",
    description:
      "Deadpool bị cuốn vào nhiệm vụ hỗn loạn cùng Wolverine xuyên đa vũ trụ.",
    duration: 128,
    age_limit: 18,
    director: "Shawn Levy",
    actors: "Ryan Reynolds, Hugh Jackman, Emma Corrin",
    trailer: "https://www.youtube.com/watch?v=73_1biulkYk",
    release_date: "2024-07-26",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
  {
    title: "Barbie",
    description:
      "Barbie rời Barbieland để khám phá thế giới thật và tìm kiếm ý nghĩa bản thân.",
    duration: 114,
    age_limit: 13,
    director: "Greta Gerwig",
    actors: "Margot Robbie, Ryan Gosling, America Ferrera",
    trailer: "https://www.youtube.com/watch?v=pBk4NYhWNMM",
    release_date: "2023-07-21",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Top Gun: Maverick",
    description:
      "Pete Maverick Mitchell trở lại huấn luyện đội phi công cho nhiệm vụ bất khả thi.",
    duration: 131,
    age_limit: 13,
    director: "Joseph Kosinski",
    actors: "Tom Cruise, Miles Teller, Jennifer Connelly",
    trailer: "https://www.youtube.com/watch?v=giXco2jaZ_4",
    release_date: "2022-05-27",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Avatar: The Way of Water",
    description:
      "Gia đình Jake Sully đối mặt hiểm họa mới trên Pandora giữa các bộ tộc biển.",
    duration: 192,
    age_limit: 13,
    director: "James Cameron",
    actors: "Sam Worthington, Zoe Saldana, Sigourney Weaver",
    trailer: "https://www.youtube.com/watch?v=d9MyW72ELq0",
    release_date: "2022-12-16",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Spider-Man: No Way Home",
    description:
      "Peter Parker đối diện hỗn loạn đa vũ trụ khi danh tính bị bại lộ.",
    duration: 148,
    age_limit: 13,
    director: "Jon Watts",
    actors: "Tom Holland, Zendaya, Benedict Cumberbatch",
    trailer: "https://www.youtube.com/watch?v=JfVOs4VSpmA",
    release_date: "2021-12-17",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "The Batman",
    description:
      "Batman lần theo vụ án của Riddler và khám phá mạng lưới tham nhũng tại Gotham.",
    duration: 176,
    age_limit: 16,
    director: "Matt Reeves",
    actors: "Robert Pattinson, Zoe Kravitz, Paul Dano",
    trailer: "https://www.youtube.com/watch?v=mqqft2x_Aa4",
    release_date: "2022-03-04",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Mission: Impossible - Dead Reckoning Part One",
    description:
      "Ethan Hunt chạy đua giành lấy vũ khí AI trước các thế lực toàn cầu.",
    duration: 163,
    age_limit: 13,
    director: "Christopher McQuarrie",
    actors: "Tom Cruise, Hayley Atwell, Ving Rhames",
    trailer: "https://www.youtube.com/watch?v=avz06PDqDbM",
    release_date: "2023-07-12",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "The Super Mario Bros. Movie",
    description:
      "Mario và Luigi bước vào Vương quốc Nấm để cứu lấy thế giới khỏi Bowser.",
    duration: 92,
    age_limit: 0,
    director: "Aaron Horvath, Michael Jelenic",
    actors: "Chris Pratt, Anya Taylor-Joy, Charlie Day",
    trailer: "https://www.youtube.com/watch?v=TnGl01FkMMo",
    release_date: "2023-04-05",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Wonka",
    description:
      "Hành trình tuổi trẻ của Willy Wonka trước khi trở thành nhà làm socola huyền thoại.",
    duration: 116,
    age_limit: 0,
    director: "Paul King",
    actors: "Timothee Chalamet, Olivia Colman, Hugh Grant",
    trailer: "https://www.youtube.com/watch?v=otNh9bTjXWg",
    release_date: "2023-12-15",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "A Quiet Place: Day One",
    description:
      "Câu chuyện sinh tồn ở ngày đầu tiên khi sinh vật săn theo âm thanh xuất hiện.",
    duration: 99,
    age_limit: 16,
    director: "Michael Sarnoski",
    actors: "Lupita Nyongo, Joseph Quinn, Alex Wolff",
    trailer: "https://www.youtube.com/watch?v=YPY7J-flzE8",
    release_date: "2024-06-28",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
  {
    title: "Godzilla x Kong: The New Empire",
    description:
      "Godzilla và Kong đối đầu hiểm họa mới xuất phát từ lòng đất cổ đại.",
    duration: 115,
    age_limit: 13,
    director: "Adam Wingard",
    actors: "Rebecca Hall, Brian Tyree Henry, Dan Stevens",
    trailer: "https://www.youtube.com/watch?v=qqrpMRDuPfc",
    release_date: "2024-03-29",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Kung Fu Panda 4",
    description:
      "Po phải tìm người kế nhiệm trong lúc đối đầu pháp sư tắc kè nguy hiểm.",
    duration: 94,
    age_limit: 0,
    director: "Mike Mitchell",
    actors: "Jack Black, Awkwafina, Viola Davis",
    trailer: "https://www.youtube.com/watch?v=_inKs4eeHiI",
    release_date: "2024-03-08",
    status: "now_showing",
    language: "English",
    country: "USA",
  },
  {
    title: "Furiosa: A Mad Max Saga",
    description:
      "Câu chuyện nguồn gốc của Furiosa giữa thế giới hoang tàn hậu tận thế.",
    duration: 148,
    age_limit: 18,
    director: "George Miller",
    actors: "Anya Taylor-Joy, Chris Hemsworth, Tom Burke",
    trailer: "https://www.youtube.com/watch?v=XJMuhwVlca4",
    release_date: "2024-05-24",
    status: "coming_soon",
    language: "English",
    country: "Australia",
  },
  {
    title: "Kingdom of the Planet of the Apes",
    description:
      "Nhiều thế hệ sau Caesar, loài khỉ và con người bước vào kỷ nguyên mới.",
    duration: 145,
    age_limit: 13,
    director: "Wes Ball",
    actors: "Owen Teague, Freya Allan, Kevin Durand",
    trailer: "https://www.youtube.com/watch?v=XtFI7SNtVpY",
    release_date: "2024-05-10",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
  {
    title: "Alien: Romulus",
    description:
      "Một nhóm người trẻ khám phá trạm không gian bỏ hoang và gặp ác mộng ngoài hành tinh.",
    duration: 119,
    age_limit: 18,
    director: "Fede Alvarez",
    actors: "Cailee Spaeny, David Jonsson, Archie Renaux",
    trailer: "https://www.youtube.com/watch?v=OzY2r2JXsDM",
    release_date: "2024-08-16",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
  {
    title: "Wicked",
    description:
      "Chuyện chưa kể về mối quan hệ giữa Elphaba và Glinda tại xứ Oz.",
    duration: 160,
    age_limit: 10,
    director: "Jon M. Chu",
    actors: "Cynthia Erivo, Ariana Grande, Jonathan Bailey",
    trailer: "https://www.youtube.com/watch?v=6COmYeLsz4c",
    release_date: "2024-11-27",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
  {
    title: "Gladiator II",
    description:
      "Phần tiếp theo của câu chuyện đấu trường La Mã với thế hệ chiến binh mới.",
    duration: 150,
    age_limit: 16,
    director: "Ridley Scott",
    actors: "Paul Mescal, Denzel Washington, Pedro Pascal",
    trailer: "https://www.youtube.com/watch?v=4rgYUipGJNo",
    release_date: "2024-11-22",
    status: "coming_soon",
    language: "English",
    country: "USA",
  },
];

const DEMO_ROOM_TYPES = ["2D", "2D", "3D", "3D", "IMAX", "VIP"];
const DEMO_GAPS = [
  { from: 4, to: 5, sort_order: 0 },
  { from: 10, to: 11, sort_order: 1 },
];
const DEMO_ROWS = [
  { rowName: "A", seatType: "Standard" },
  { rowName: "B", seatType: "Standard" },
  { rowName: "C", seatType: "Standard" },
  { rowName: "D", seatType: "Standard" },
  { rowName: "E", seatType: "VIP" },
  { rowName: "F", seatType: "VIP" },
  { rowName: "G", seatType: "VIP" },
  { rowName: "H", seatType: "Couple" },
];

const getTableColumns = async (tableName) => {
  const [columns] = await db.query(`SHOW COLUMNS FROM ${tableName}`);
  return columns.map((column) => column.Field);
};

const ensureRoomSeatGapsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS RoomSeatGaps (
      seat_gap_id INT AUTO_INCREMENT PRIMARY KEY,
      room_id INT NOT NULL,
      gap_from INT NOT NULL,
      gap_to INT NOT NULL,
      sort_order INT DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES Rooms(room_id) ON DELETE CASCADE
    )
  `);
};

const buildMoviePayload = (movie, movieColumns) => {
  const placeholderPoster = `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`;
  const payload = {
    title: movie.title,
    description: movie.description,
    duration: movie.duration,
    age_limit: movie.age_limit,
    director: movie.director,
    actors: movie.actors,
    trailer: movie.trailer,
    poster: placeholderPoster,
    posters: JSON.stringify([placeholderPoster]),
    release_date: movie.release_date,
    status: movie.status,
    language: movie.language,
    country: movie.country,
    is_deleted: 0,
  };

  const filteredEntries = Object.entries(payload).filter(([key]) =>
    movieColumns.includes(key),
  );

  return {
    columns: filteredEntries.map(([key]) => key),
    values: filteredEntries.map(([, value]) => value),
  };
};

const seedMovies = async () => {
  const movieColumns = await getTableColumns("Movies");
  let insertedCount = 0;

  for (const movie of DEMO_MOVIES) {
    const [[existingMovie]] = await db.query(
      "SELECT movie_id FROM Movies WHERE title = ? LIMIT 1",
      [movie.title],
    );

    if (existingMovie) {
      continue;
    }

    const payload = buildMoviePayload(movie, movieColumns);
    const placeholders = payload.columns.map(() => "?").join(", ");

    await db.query(
      `INSERT INTO Movies (${payload.columns.join(", ")}) VALUES (${placeholders})`,
      payload.values,
    );
    insertedCount += 1;
  }

  return insertedCount;
};

const buildDemoSeats = (roomId) =>
  DEMO_ROWS.flatMap((row) =>
    Array.from({ length: 14 }, (_, index) => ({
      room_id: roomId,
      seat_code: `${row.rowName}${index + 1}`,
      seat_type: row.seatType,
      status: "active",
    })),
  );

const syncRoomSeats = async (connection, roomId) => {
  const desiredSeats = buildDemoSeats(roomId);
  const [existingSeats] = await connection.query(
    "SELECT seat_id, seat_code FROM Seats WHERE room_id = ?",
    [roomId],
  );
  const existingSeatMap = new Map(
    existingSeats.map((seat) => [seat.seat_code, seat.seat_id]),
  );
  const desiredCodes = new Set(desiredSeats.map((seat) => seat.seat_code));

  for (const seat of desiredSeats) {
    const existingSeatId = existingSeatMap.get(seat.seat_code);

    if (existingSeatId) {
      await connection.query(
        "UPDATE Seats SET seat_type = ?, status = ? WHERE seat_id = ?",
        [seat.seat_type, seat.status, existingSeatId],
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
    const placeholders = seatsToDelete.map(() => "?").join(", ");
    await connection.query(
      `DELETE FROM Seats WHERE seat_id IN (${placeholders})`,
      seatsToDelete.map((seat) => seat.seat_id),
    );
  }
};

const syncRoomGaps = async (connection, roomId) => {
  await connection.query("DELETE FROM RoomSeatGaps WHERE room_id = ?", [roomId]);

  for (const gap of DEMO_GAPS) {
    await connection.query(
      "INSERT INTO RoomSeatGaps (room_id, gap_from, gap_to, sort_order) VALUES (?, ?, ?, ?)",
      [roomId, gap.from, gap.to, gap.sort_order],
    );
  }
};

const seedCinemaRooms = async () => {
  await ensureRoomSeatGapsTable();

  const connection = await db.getConnection();
  let createdRooms = 0;
  let updatedRooms = 0;

  try {
    await connection.beginTransaction();

    const [cinemas] = await connection.query(
      "SELECT cinemas_id, cinema_name FROM Cinemas ORDER BY cinemas_id ASC",
    );

    for (const cinema of cinemas) {
      for (let index = 0; index < 6; index += 1) {
        const roomName = `Demo P${String(index + 1).padStart(2, "0")}`;
        const roomType = DEMO_ROOM_TYPES[index] || "2D";
        const totalSeat = 8 * 14;

        const [[existingRoom]] = await connection.query(
          "SELECT room_id FROM Rooms WHERE cinema_id = ? AND room_name = ? LIMIT 1",
          [cinema.cinemas_id, roomName],
        );

        let roomId;

        if (existingRoom) {
          roomId = existingRoom.room_id;
          await connection.query(
            "UPDATE Rooms SET room_type = ?, total_seat = ? WHERE room_id = ?",
            [roomType, totalSeat, roomId],
          );
          updatedRooms += 1;
        } else {
          const [insertResult] = await connection.query(
            "INSERT INTO Rooms (cinema_id, room_name, room_type, total_seat) VALUES (?, ?, ?, ?)",
            [cinema.cinemas_id, roomName, roomType, totalSeat],
          );
          roomId = insertResult.insertId;
          createdRooms += 1;
        }

        await syncRoomSeats(connection, roomId);
        await syncRoomGaps(connection, roomId);
      }
    }

    await connection.commit();
    return { cinemaCount: cinemas.length, createdRooms, updatedRooms };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

async function seedDemoData() {
  try {
    console.log("▶ Bat dau seed demo du lieu...");

    const insertedMovies = await seedMovies();
    const roomResult = await seedCinemaRooms();

    console.log(`✅ Da them moi ${insertedMovies} phim demo.`);
    console.log(
      `✅ Da dong bo 6 phong demo cho ${roomResult.cinemaCount} rap (${roomResult.createdRooms} phong moi, ${roomResult.updatedRooms} phong cap nhat).`,
    );
    console.log("✅ Moi phong demo co 8 day x 14 ghe va 2 khoang cach.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed demo error:", error);
    process.exit(1);
  }
}

seedDemoData();
