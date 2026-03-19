const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const pool = require("./config/db");
const swaggerSpec = require("./config/swagger");
const authRoutes = require("./routes/auth.routes");
const seedAdmin = require("./config/seeder");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Auth Service is running" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  await seedAdmin();
});
