const {
  createIncident,
  getAllIncidents,
  getOpenIncidents,
  getIncidentById,
  updateIncidentStatus,
  assignResponderToIncident,
} = require("../models/incident.model");
const {
  getAvailableRespondersByType,
  updateResponderAvailability,
  getResponderById,
} = require("../models/responder.model");
const { getAvailableHospitals } = require("../models/hospital.model");
const { publishEvent } = require("../config/rabbitmq");

// Haversine formula — returns distance in km
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Select nearest available responder
const selectNearestResponder = (responders, incidentLat, incidentLng) => {
  let nearest = null;
  let minDistance = Infinity;

  for (const responder of responders) {
    const distance = haversine(
      incidentLat,
      incidentLng,
      parseFloat(responder.latitude),
      parseFloat(responder.longitude),
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...responder, distance_km: parseFloat(distance.toFixed(2)) };
    }
  }

  return nearest;
};

// Map incident type to responder type
const getResponderTypeForIncident = (incidentType) => {
  const map = {
    medical: "ambulance",
    fire: "fire_truck",
    crime: "police",
    accident: "police",
    other: "police",
  };
  return map[incidentType];
};

// POST /api/incidents
const createNewIncident = async (req, res) => {
  try {
    const { citizen_name, incident_type, latitude, longitude, notes } =
      req.body;

    if (!citizen_name || !incident_type || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message:
          "citizen_name, incident_type, latitude and longitude are required",
      });
    }

    const responderType = getResponderTypeForIncident(incident_type);
    const availableResponders =
      await getAvailableRespondersByType(responderType);

    if (availableResponders.length === 0) {
      return res.status(503).json({
        success: false,
        message: `No available ${responderType} responders at this time`,
      });
    }

    const nearest = selectNearestResponder(
      availableResponders,
      parseFloat(latitude),
      parseFloat(longitude),
    );

    let assignedHospitalId = null;

    // For medical emergencies, find nearest available hospital
    if (incident_type === "medical") {
      const hospitals = await getAvailableHospitals();
      if (hospitals.length === 0) {
        return res.status(503).json({
          success: false,
          message: "No hospitals with available beds at this time",
        });
      }
      const nearestHospital = selectNearestResponder(
        hospitals.map((h) => ({
          ...h,
          responder_id: h.hospital_id,
        })),
        parseFloat(latitude),
        parseFloat(longitude),
      );
      assignedHospitalId = nearestHospital.hospital_id;
    }

    // Create the incident
    const incident = await createIncident({
      citizen_name,
      incident_type,
      latitude,
      longitude,
      notes,
      created_by: req.user.userId,
      assigned_unit_id: nearest.responder_id,
      assigned_unit_type: responderType,
      hospital_id: assignedHospitalId,
    });

    // Mark responder as unavailable
    await updateResponderAvailability(nearest.responder_id, false);

    // Publish incident.created event
    await publishEvent("emergency.events", "incident.created", {
      incident_id: incident.incident_id,
      citizen_name: incident.citizen_name,
      incident_type: incident.incident_type,
      latitude: incident.latitude,
      longitude: incident.longitude,
      region: nearest.region || "Unknown",
      notes: incident.notes,
      created_by: req.user.userId,
      status: "dispatched",
    });

    // Publish incident.dispatched event
    await publishEvent("emergency.events", "incident.dispatched", {
      incident_id: incident.incident_id,
      incident_type: incident.incident_type,
      assigned_unit_id: nearest.responder_id,
      assigned_unit_type: responderType,
      distance_km: nearest.distance_km,
      dispatched_at: new Date().toISOString(),
      hospital_id: assignedHospitalId,
    });

    return res.status(201).json({
      success: true,
      message: "Incident created and responder dispatched",
      data: {
        incident,
        assigned_responder: {
          responder_id: nearest.responder_id,
          name: nearest.name,
          type: nearest.type,
          distance_km: nearest.distance_km,
        },
        hospital_id: assignedHospitalId,
      },
    });
  } catch (err) {
    console.error("Create incident error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/incidents
const getIncidents = async (req, res) => {
  try {
    const { status, incident_type } = req.query;
    const incidents = await getAllIncidents({ status, incident_type });
    return res.status(200).json({ success: true, data: incidents });
  } catch (err) {
    console.error("Get incidents error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/incidents/open
const getOpenIncidentsList = async (req, res) => {
  try {
    const incidents = await getOpenIncidents();
    return res.status(200).json({ success: true, data: incidents });
  } catch (err) {
    console.error("Get open incidents error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/incidents/:id
const getIncident = async (req, res) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    }
    return res.status(200).json({ success: true, data: incident });
  } catch (err) {
    console.error("Get incident error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/incidents/:id/status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, message: "Status is required" });
    }

    const incident = await updateIncidentStatus(id, status, req.user.userId);
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    }

    // Publish status update event
    await publishEvent("emergency.events", "incident.status.updated", {
      incident_id: incident.incident_id,
      new_status: status,
      changed_by: req.user.userId,
      changed_at: new Date().toISOString(),
    });

    // If resolved, free up the responder and publish resolved event
    if (status === "resolved") {
      if (incident.assigned_unit_id) {
        await updateResponderAvailability(incident.assigned_unit_id, true);
      }

      await publishEvent("emergency.events", "incident.resolved", {
        incident_id: incident.incident_id,
        assigned_unit_id: incident.assigned_unit_id,
        resolved_at: new Date().toISOString(),
        created_at: incident.created_at,
        total_duration_sec: Math.floor(
          (new Date() - new Date(incident.created_at)) / 1000,
        ),
      });
    }

    return res
      .status(200)
      .json({ success: true, message: "Status updated", data: incident });
  } catch (err) {
    console.error("Update status error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/incidents/:id/assign
const assignResponder = async (req, res) => {
  try {
    const { id } = req.params;
    const { responder_id, hospital_id } = req.body;

    if (!responder_id) {
      return res
        .status(400)
        .json({ success: false, message: "responder_id is required" });
    }

    const responder = await getResponderById(responder_id);
    if (!responder) {
      return res
        .status(404)
        .json({ success: false, message: "Responder not found" });
    }

    const incident = await assignResponderToIncident(
      id,
      responder_id,
      responder.type,
      hospital_id,
    );
    if (!incident) {
      return res
        .status(404)
        .json({ success: false, message: "Incident not found" });
    }

    await updateResponderAvailability(responder_id, false);

    return res
      .status(200)
      .json({ success: true, message: "Responder assigned", data: incident });
  } catch (err) {
    console.error("Assign responder error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createNewIncident,
  getIncidents,
  getOpenIncidentsList,
  getIncident,
  updateStatus,
  assignResponder,
};
