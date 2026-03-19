const bcrypt = require("bcrypt");
const pool = require("./db");

const seedAdmin = async () => {
  try {
    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [
      "admin@emergency.gh",
    ]);

    if (existing.rows.length > 0) {
      console.log("✅ Admin already exists, skipping seed");
      return;
    }

    const passwordHash = await bcrypt.hash("admin123", 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4)`,
      ["System Admin", "admin@emergency.gh", passwordHash, "system_admin"],
    );

    console.log(
      "✅ Default admin seeded — email: admin@emergency.gh, password: admin123",
    );
  } catch (err) {
    console.error("❌ Seeder error:", err);
  }
};

module.exports = seedAdmin;
