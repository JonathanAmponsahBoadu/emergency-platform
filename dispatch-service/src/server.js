const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

require("./config/db");
const redis = require("./config/redis");
const swaggerSpec = require("./config/swagger");
const { connect: connectRabbitMQ } = require("./config/rabbitmq");
const { createDispatch } = require("./models/dispatch.model");
const { updateVehicleLocation } = require("./models/vehicle.model");
const { saveLocationHistory } = require("./models/location.model");
const { getDispatchByIncidentId } = require("./models/dispatch.model");
const vehicleRoutes = require("./routes/vehicle.routes");
const dispatchRoutes = require("./routes/dispatch.routes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

app.set("io", io);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/dispatches", dispatchRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Dispatch Service is running" });
});

// ─── Socket.io — namespace: /tracking ───
const tracking = io.of("/tracking");

tracking.on("connection", (socket) => {
  console.log(`🔌 Driver/Admin connected: ${socket.id}`);

  // Admin joins incident room to receive live updates
  socket.on("join:incident", ({ incident_id }) => {
    socket.join(`incident:${incident_id}`);
    console.log(`👁️ Socket ${socket.id} joined incident room: ${incident_id}`);
  });

  // Driver pushes GPS location via WebSocket
  socket.on(
    "driver:location:push",
    async ({ vehicle_id, lat, lng, speed_kmh, incident_id }) => {
      try {
        const locationData = {
          vehicle_id,
          lat,
          lng,
          speed_kmh: speed_kmh || 0,
          timestamp: new Date().toISOString(),
        };

        // Update Redis cache (TTL 30s)
        await redis.set(
          `vehicle:${vehicle_id}:location`,
          JSON.stringify(locationData),
          { ex: 30 },
        );

        // Update DB
        await updateVehicleLocation(vehicle_id, lat, lng);

        // Save history
        let dispatchId = null;
        if (incident_id) {
          const dispatch = await getDispatchByIncidentId(incident_id);
          if (dispatch) dispatchId = dispatch.dispatch_id;
        }
        await saveLocationHistory(
          vehicle_id,
          dispatchId,
          lat,
          lng,
          speed_kmh || 0,
        );

        // Broadcast to incident room
        if (incident_id) {
          tracking
            .to(`incident:${incident_id}`)
            .emit("vehicle:location:update", {
              vehicle_id,
              incident_id,
              lat,
              lng,
              speed_kmh: speed_kmh || 0,
              timestamp: new Date().toISOString(),
            });
        }
      } catch (err) {
        console.error("❌ GPS push error:", err.message);
      }
    },
  );

  socket.on("disconnect", () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
  });
});

// ─── RabbitMQ consumer — incident.dispatched ───
const onIncidentDispatched = async (data) => {
  try {
    const { incident_id, assigned_unit_id, assigned_unit_type } = data;
    console.log(
      `📥 Incident dispatched: ${incident_id} → unit: ${assigned_unit_id} (${assigned_unit_type})`,
    );
  } catch (err) {
    console.error("❌ Error handling incident.dispatched:", err.message);
  }
};

const PORT = process.env.PORT || 3003;
server.listen(PORT, async () => {
  console.log(`🚀 Dispatch Service running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  await connectRabbitMQ(onIncidentDispatched);
});
