const {
  getAllDispatches,
  getDispatchById,
  updateDispatchStatus,
} = require("../models/dispatch.model");
const { updateVehicleStatus } = require("../models/vehicle.model");
const { publishEvent, EXCHANGES } = require("../config/rabbitmq");

// GET /api/dispatches
const getDispatches = async (req, res) => {
  try {
    const dispatches = await getAllDispatches();
    return res.status(200).json({ success: true, data: dispatches });
  } catch (err) {
    console.error("Get dispatches error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/dispatches/:id
const getDispatch = async (req, res) => {
  try {
    const dispatch = await getDispatchById(req.params.id);
    if (!dispatch) {
      return res
        .status(404)
        .json({ success: false, message: "Dispatch not found" });
    }
    return res.status(200).json({ success: true, data: dispatch });
  } catch (err) {
    console.error("Get dispatch error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/dispatches/:id/status
const updateStatus = async (req, res, io) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const dispatch = await updateDispatchStatus(id, status);
    if (!dispatch) {
      return res
        .status(404)
        .json({ success: false, message: "Dispatch not found" });
    }

    // Update vehicle status accordingly
    const vehicleStatusMap = {
      en_route: "en_route",
      on_scene: "on_scene",
      returning: "returning",
      completed: "idle",
    };

    if (vehicleStatusMap[status]) {
      await updateVehicleStatus(dispatch.vehicle_id, vehicleStatusMap[status]);
    }

    // Broadcast status change via WebSocket
    if (io) {
      io.to(`incident:${dispatch.incident_id}`).emit(
        "dispatch:status:changed",
        {
          dispatch_id: dispatch.dispatch_id,
          status,
        },
      );
    }

    // Publish RabbitMQ events for analytics
    if (status === "on_scene") {
      await publishEvent(EXCHANGES.DISPATCH, "dispatch.vehicle.arrived", {
        dispatch_id: dispatch.dispatch_id,
        vehicle_id: dispatch.vehicle_id,
        incident_id: dispatch.incident_id,
        arrived_at: new Date().toISOString(),
        dispatched_at: dispatch.dispatched_at,
        response_time_sec: dispatch.response_time_sec,
      });
    }

    if (status === "returning") {
      await publishEvent(EXCHANGES.DISPATCH, "dispatch.vehicle.returning", {
        dispatch_id: dispatch.dispatch_id,
        vehicle_id: dispatch.vehicle_id,
        incident_id: dispatch.incident_id,
        returning_at: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dispatch status updated",
      data: dispatch,
    });
  } catch (err) {
    console.error("Update dispatch status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getDispatches, getDispatch, updateStatus };
