const {
  getAllResponders,
  getResponderById,
  createResponder,
  updateResponder,
} = require("../models/responder.model");

// GET /api/responders
const getResponders = async (req, res) => {
  try {
    let responders = await getAllResponders();

    // Filter for institutional admins
    if (req.user?.role !== "system_admin" && req.user?.hospital_id) {
      responders = responders.filter(r => r.hospital_id === req.user.hospital_id);
    }

    return res.status(200).json({ success: true, data: responders });
  } catch (err) {
    console.error("Get responders error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const { publishEvent, EXCHANGES } = require("../config/rabbitmq");

// POST /api/responders
const registerResponder = async (req, res) => {
  try {
    const {
      name,
      type,
      latitude,
      longitude,
      hospital_id,
      contact_phone,
      region,
    } = req.body;

    if (!name || !type || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "name, type, latitude and longitude are required",
      });
    }

    const finalHospitalId = req.user?.role === "system_admin" ? hospital_id : req.user?.hospital_id;

    const responder = await createResponder({
      name,
      type,
      latitude,
      longitude,
      hospital_id: finalHospitalId,
      contact_phone,
      region,
    });

    // Notify Dispatch Service
    await publishEvent(EXCHANGES.EMERGENCY, "incident.responder.created", {
      responder_id: responder.responder_id,
      name: responder.name,
      type: responder.type,
      hospital_id: responder.hospital_id,
      latitude: responder.latitude,
      longitude: responder.longitude,
      contact_phone: responder.contact_phone,
    });

    return res.status(201).json({
      success: true,
      message: "Responder registered",
      data: responder,
    });
  } catch (err) {
    console.error("Register responder error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/responders/:id
const updateResponderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const existing = await getResponderById(id);
    if (!existing) {
       return res.status(404).json({ success: false, message: "Responder not found" });
    }

    if (req.user?.role !== "system_admin" && existing.hospital_id !== req.user?.hospital_id) {
       return res.status(403).json({ success: false, message: "Access denied" });
    }

    const updated = await updateResponder(id, req.body);

    return res
      .status(200)
      .json({ success: true, message: "Responder updated", data: updated });
  } catch (err) {
    console.error("Update responder error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getResponders, registerResponder, updateResponderById };
