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

    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
};

start();
