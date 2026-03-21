const {
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
  getHospitalCapacity,
  getIncidentsSummary,
  getTopResponders,
} = require("../models/analytics.model");

// GET /api/analytics/response-times
const responseTimes = async (req, res) => {
  try {
    const data = await getResponseTimes();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Response times error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/analytics/incidents-by-region
const incidentsByRegion = async (req, res) => {
  try {
    const data = await getIncidentsByRegion();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Incidents by region error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/analytics/resource-utilization
const resourceUtilization = async (req, res) => {
  try {
    const data = await getResourceUtilization();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Resource utilization error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/analytics/hospital-capacity
const hospitalCapacity = async (req, res) => {
  try {
    const data = await getHospitalCapacity();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Hospital capacity error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/analytics/incidents/summary
const incidentsSummary = async (req, res) => {
  try {
    const data = await getIncidentsSummary();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Incidents summary error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/analytics/top-responders
const topResponders = async (req, res) => {
  try {
    const data = await getTopResponders();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Top responders error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  responseTimes,
  incidentsByRegion,
  resourceUtilization,
  hospitalCapacity,
  incidentsSummary,
  topResponders,
};
