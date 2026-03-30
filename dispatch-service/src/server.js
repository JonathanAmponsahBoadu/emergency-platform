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
const { updateVehicleLocation, createVehicle } = require("./models/vehicle.model");
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

  // Dynamic room joining
  socket.on("join:room", ({ room }) => {
    socket.join(room);
    console.log(`👁️ Socket ${socket.id} joined room: ${room}`);
  });

  // Real-time Fleet Tracking Joins
  socket.on("join:room", ({ room }) => {
    socket.join(room);
    console.log(`📡 Socket ${socket.id} joined room: ${room}`);
  });

  // Legacy support for incident joins
  socket.on("join:incident", ({ incident_id }) => {
    const room = incident_id.startsWith("incident:") || incident_id.startsWith("station:") 
      ? incident_id 
      : `incident:${incident_id}`;
    socket.join(room);
    console.log(`👁️ Socket ${socket.id} joined (legacy): ${room}`);
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

        // 1. Broadcast to specific station room (for institutional admins)
        const vehicle = await getVehicleById(vehicle_id);
        if (vehicle && vehicle.station_id) {
          tracking
            .to(`station:${vehicle.station_id}`)
            .emit("vehicle:location:update", {
              vehicle_id,
              lat,
              lng,
              speed_kmh: speed_kmh || 0,
              timestamp: new Date().toISOString(),
            });
        }

        // 2. Broadcast to global fleet room (for system admins)
        tracking
          .to("station:all")
          .emit("vehicle:location:update", {
            vehicle_id,
            lat,
            lng,
            speed_kmh: speed_kmh || 0,
            timestamp: new Date().toISOString(),
          });
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

const onResponderUpdated = async (data) => {
  try {
    const { responder_id, driver_id, is_available } = data;
    console.log(`📥 Update received for responder: ${responder_id} (Driver: ${driver_id})`);
    
    await updateVehicleStatus(responder_id, is_available ? "idle" : "responding");
    
    // We also need to sync the driver_id in the vehicles table
    await pool.query(
      "UPDATE vehicles SET driver_id = $1, updated_at = NOW() WHERE vehicle_id = $2",
      [driver_id || null, responder_id]
    );
  } catch (err) {
    console.error("❌ Error handling responder.updated:", err.message);
  }
};

const onResponderCreated = async (data) => {
  try {
    const { responder_id, name, type, hospital_id, contact_phone } = data;
    console.log(`📥 Syncing responder: ${name} (${type})`);
    
    // Convert incident types to dispatch types if necessary
    let vType = "ambulance";
    if (type === "police_car") vType = "police";
    if (type === "fire_truck") vType = "fire_truck";

    await createVehicle({
      vehicle_id: responder_id,
      plate_number: contact_phone || `UNIT-${responder_id.slice(0, 4)}`,
      vehicle_type: vType,
      station_id: hospital_id,
    });
    console.log(`✅ Vehicle created/synced: ${responder_id}`);
  } catch (err) {
    console.error("❌ Error syncing responder to vehicle:", err.message);
  }
};

const PORT = process.env.PORT || 3003;
server.listen(PORT, async () => {
  console.log(`🚀 Dispatch Service running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  await connectRabbitMQ(onIncidentDispatched, onResponderCreated);
});
