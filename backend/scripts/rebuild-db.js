import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDbName = process.argv[2] || "sweetstarcinema_rebuild";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true,
});

try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${targetDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.query(`USE \`${targetDbName}\``);

  const schemaPath = path.resolve(__dirname, "../../database/db.sql");
  let schemaSql = fs.readFileSync(schemaPath, "utf8");

  // Strip UTF-8 BOM and any schema-selection header from db.sql.
  schemaSql = schemaSql.replace(/^\uFEFF/, "");
  schemaSql = schemaSql.replace(/\bCREATE\s+DATABASE\b[^;]*;\s*/gi, "");
  schemaSql = schemaSql.replace(/\bUSE\s+[^;]+;\s*/gi, "");

  await connection.query(schemaSql);

  console.log(`Imported base schema into database: ${targetDbName}`);
} finally {
  await connection.end();
}
