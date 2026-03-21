const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on("error", (err) => {
  console.warn("⚠️ Pool error (handled):", err.message);
});

process.on("uncaughtException", (err) => {
  if (err.message === "Connection terminated unexpectedly") {
    console.warn("⚠️ Neon connection dropped, will reconnect on next query");
  } else {
    console.error("❌ Uncaught exception:", err);
    process.exit(1);
  }
});

console.log("✅ Incident DB pool initialized");

module.exports = pool;
