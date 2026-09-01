import app from "./app.js";
import { db } from "./config/db.js";
import { seedDefaultAdminUser } from "./src/admin/models/authModel.js";

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    const conn = await db.getConnection();
    try {
      await conn.ping();
    } finally {
      conn.release();
    }

    const seedResult = await seedDefaultAdminUser();
    if (seedResult.created) {
      console.log("\n========================================");
      console.log("🎉 Default admin user created:");
      console.log("  Email   : admin@example.com");
      console.log("  Username: admin");
      console.log("  Password: 123456");
      console.log("========================================\n");
    } else if (seedResult.error) {
      console.warn("⚠️  Admin seed warning:", seedResult.error);
    } else {
      console.log("ℹ️  Default admin user already exists (admin@example.com / 123456)");
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
