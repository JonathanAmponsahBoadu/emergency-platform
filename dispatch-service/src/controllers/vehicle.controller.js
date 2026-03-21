const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicleLocation,
  updateVehicleStatus,
} = require("../models/vehicle.model");
const {
  saveLocationHistory,
  getLocationHistory,
} = require("../models/location.model");
const { getDispatchByIncidentId } = require("../models/dispatch.model");
const { publishEvent, EXCHANGES } = require("../config/rabbitmq");
const redis = require("../config/redis");

// POST /api/vehicles/register
const registerVehicle = async (req, res) => {
  try {
    const { plate_number, vehicle_type, station_id, driver_id } = req.body;

    if (!plate_number || !vehicle_type) {
      return res.status(400).json({
        success: false,
        message: "plate_number and vehicle_type are required",
      });
    }

    const vehicle = await createVehicle({
      plate_number,
      vehicle_type,
      station_id,
      driver_id,
    });
    return res
      .status(201)
      .json({ success: true, message: "Vehicle registered", data: vehicle });
  } catch (err) {
    console.error("Register vehicle error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/vehicles
const getVehicles = async (req, res) => {
  try {
    const vehicles = await getAllVehicles();
    return res.status(200).json({ success: true, data: vehicles });
  } catch (err) {
    console.error("Get vehicles error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/vehicles/:id
const getVehicle = async (req, res) => {
  try {
    const vehicle = await getVehicleById(req.params.id);
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }
    return res.status(200).json({ success: true, data: vehicle });
  } catch (err) {
    console.error("Get vehicle error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/vehicles/:id/location
const getVehicleLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const cached = await redis.get(`vehicle:${id}:location`);

    if (cached) {
      const data = typeof cached === "string" ? JSON.parse(cached) : cached;
      return res.status(200).json({ success: true, source: "redis", data });
    }

    // Fallback to DB if Redis cache expired
    const vehicle = await getVehicleById(id);
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    return res.status(200).json({
      success: true,
      source: "database",
      data: {
        vehicle_id: vehicle.vehicle_id,
        lat: vehicle.current_lat,
        lng: vehicle.current_lng,
        last_seen: vehicle.last_seen,
      },
    });
  } catch (err) {
    console.error("Get vehicle location error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/vehicles/:id/history
const getVehicleHistory = async (req, res) => {
  try {
    const history = await getLocationHistory(req.params.id);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    console.error("Get vehicle history error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/vehicles/:id/location — driver GPS ping
const pushVehicleLocation = async (req, res, io) => {
  try {
    const { id } = req.params;
    const { lat, lng, speed_kmh, incident_id } = req.body;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ success: false, message: "lat and lng are required" });
    }

    // 1. Update Redis cache (TTL 30s)
    const locationData = {
      vehicle_id: id,
      lat,
      lng,
      speed_kmh: speed_kmh || 0,
      timestamp: new Date().toISOString(),
    };
    await redis.set(`vehicle:${id}:location`, JSON.stringify(locationData), {
      ex: 30,
    });

    // 2. Update vehicle current location in DB
    await updateVehicleLocation(id, lat, lng);

    // 3. Get active dispatch for this vehicle
    let dispatchId = null;
    if (incident_id) {
      const dispatch = await getDispatchByIncidentId(incident_id);
      if (dispatch) dispatchId = dispatch.dispatch_id;
    }

    // 4. Save to location history
    await saveLocationHistory(id, dispatchId, lat, lng, speed_kmh || 0);

    // 5. Broadcast via WebSocket to incident room
    if (io && incident_id) {
      io.of("/tracking")
        .to(`incident:${incident_id}`)
        .emit("vehicle:location:update", {
          vehicle_id: id,
          incident_id,
          lat,
          lng,
          speed_kmh: speed_kmh || 0,
          timestamp: new Date().toISOString(),
        });
    }

    return res
      .status(200)
      .json({ success: true, message: "Location updated", data: locationData });
  } catch (err) {
    console.error("Push location error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  registerVehicle,
  getVehicles,
  getVehicle,
  getVehicleLocation,
  getVehicleHistory,
  pushVehicleLocation,
};
