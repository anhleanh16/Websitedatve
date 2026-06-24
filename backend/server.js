import app from "./app.js";
import { db } from "./config/db.js";

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    const conn = await db.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }

    const server = app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Backend may already be running.`,
        );
        process.exit(0);
      }
      console.error(err);
      process.exit(1);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

start();
