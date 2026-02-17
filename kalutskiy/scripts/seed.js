const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

function pickExistingPath(candidates, label) {
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`${label} not found. Tried:\n` + candidates.map(p => ` - ${p}`).join("\n"));
}

function safeDbName(name) {
  if (!name || !/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`Invalid DB_NAME="${name}". Use only letters, numbers and underscore.`);
  }
  return name;
}

(async () => {
  const dbName = safeDbName(process.env.DB_NAME);

  const schemaPath = pickExistingPath(
    [
      path.resolve(process.cwd(), "DB_schema.sql"),
      path.resolve(process.cwd(), "database", "DB_schema.sql"),
      path.resolve(process.cwd(), "db", "DB_schema.sql"),
    ],
    "DB_schema.sql"
  );

  const seedPath = pickExistingPath(
    [
      path.resolve(process.cwd(), "DB_seed.sql"),
      path.resolve(process.cwd(), "database", "DB_seed.sql"),
      path.resolve(process.cwd(), "db", "DB_seed.sql"),
    ],
    "DB_seed.sql"
  );

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    console.log("⛔ Dropping database...");
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log("🆕 Creating database...");
    await conn.query(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    await conn.query(`USE \`${dbName}\``);

    console.log("📄 Importing schema from:", schemaPath);
    await conn.query(fs.readFileSync(schemaPath, "utf8"));

    console.log("🌱 Importing seed from:", seedPath);
    await conn.query(fs.readFileSync(seedPath, "utf8"));

    console.log("✅ Database successfully seeded");
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
