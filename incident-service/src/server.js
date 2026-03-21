const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

require("./config/db");
const swaggerSpec = require("./config/swagger");
const { connect: connectRabbitMQ } = require("./config/rabbitmq");
const incidentRoutes = require("./routes/incident.routes");
const responderRoutes = require("./routes/responder.routes");
const hospitalRoutes = require("./routes/hospital.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/incidents", incidentRoutes);
app.use("/api/responders", responderRoutes);
app.use("/api/hospitals", hospitalRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Incident Service is running" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`🚀 Incident Service running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  await connectRabbitMQ();
});
