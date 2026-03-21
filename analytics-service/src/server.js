const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

require("./config/db");
const swaggerSpec = require("./config/swagger");
const { connect: connectRabbitMQ } = require("./config/rabbitmq");
const analyticsRoutes = require("./routes/analytics.routes");
const {
  upsertIncidentSnapshot,
  updateSnapshotStatus,
  updateSnapshotResponseTime,
  insertResponseMetric,
  updateResponseMetricArrival,
  updateResponseMetricDuration,
  insertHospitalCapacityLog,
  upsertResourceUtilization,
} = require("./models/analytics.model");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/analytics", analyticsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Analytics Service is running" });
});

// ─── RabbitMQ Event Handlers ───
const handlers = {
  onIncidentCreated: async (data) => {
    await upsertIncidentSnapshot({
      incident_id: data.incident_id,
      incident_type: data.incident_type,
      region: data.region,
      latitude: data.latitude,
      longitude: data.longitude,
      status: "created",
    });
  },

  onIncidentDispatched: async (data) => {
    await upsertIncidentSnapshot({
      incident_id: data.incident_id,
      incident_type: data.incident_type,
      status: "dispatched",
    });

    await insertResponseMetric({
      incident_id: data.incident_id,
      responder_type: data.assigned_unit_type,
      responder_id: data.assigned_unit_id,
      dispatch_time: data.dispatched_at,
    });

    await upsertResourceUtilization({
      responder_id: data.assigned_unit_id,
      responder_type: data.assigned_unit_type,
    });
  },

  onIncidentStatusUpdated: async (data) => {
    await updateSnapshotStatus(data.incident_id, data.new_status);
  },

  onIncidentResolved: async (data) => {
    await updateSnapshotStatus(data.incident_id, "resolved");
    await updateSnapshotResponseTime(data.incident_id, data.total_duration_sec);
    await updateResponseMetricDuration(
      data.incident_id,
      data.total_duration_sec,
    );
  },

  onDispatchArrived: async (data) => {
    await updateResponseMetricArrival(
      data.incident_id,
      data.arrived_at,
      data.response_time_sec,
    );
  },

  onDispatchReturning: async (data) => {
    console.log(`📥 Vehicle returning from incident: ${data.incident_id}`);
  },

  onHospitalCapacity: async (data) => {
    await insertHospitalCapacityLog({
      hospital_id: data.hospital_id,
      hospital_name: data.hospital_name,
      total_beds: data.total_beds,
      available_beds: data.available_beds,
    });
  },
};

const PORT = process.env.PORT || 3004;
app.listen(PORT, async () => {
  console.log(`🚀 Analytics Service running on port ${PORT}`);
  console.log(`📚 Swagger docs at http://localhost:${PORT}/api-docs`);
  await connectRabbitMQ(handlers);
});
