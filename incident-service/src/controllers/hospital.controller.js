const {
  getAllHospitals,
  getHospitalById,
  createHospital,
  updateHospitalCapacity,
  getHospitalsWithResponders,
} = require("../models/hospital.model");
const { publishEvent } = require("../config/rabbitmq");

// GET /api/hospitals
const getHospitals = async (req, res) => {
  try {
    const hospitals = await getAllHospitals();
    return res.status(200).json({ success: true, data: hospitals });
  } catch (err) {
    console.error("Get hospitals error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/hospitals
const addHospital = async (req, res) => {
  try {
    const { name, latitude, longitude, total_beds, available_beds, type } =
      req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "name, latitude and longitude are required",
      });
    }

    const hospital = await createHospital({
      name,
      latitude,
      longitude,
      total_beds: total_beds || 0,
      available_beds: available_beds || 0,
      type: type || "hospital",
    });

    return res.status(201).json({
      success: true,
      message: "Hospital created",
      data: hospital,
    });
  } catch (err) {
    console.error("Create hospital error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/hospitals/:id/capacity
const updateCapacity = async (req, res) => {
  try {
    const { id } = req.params;
    const { total_beds, available_beds } = req.body;

    const hospital = await updateHospitalCapacity(
      id,
      total_beds,
      available_beds,
    );
    if (!hospital) {
      return res
        .status(404)
        .json({ success: false, message: "Hospital not found" });
    }

    await publishEvent("hospital.events", "hospital.capacity.updated", {
      hospital_id: hospital.hospital_id,
      hospital_name: hospital.name,
      total_beds: hospital.total_beds,
      available_beds: hospital.available_beds,
      updated_by: req.user.userId,
      recorded_at: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Capacity updated",
      data: hospital,
    });
  } catch (err) {
    console.error("Update capacity error:", err);
  }
};

// GET /api/hospitals/full
const getHospitalsFull = async (req, res) => {
  try {
    const hospitals = await getHospitalsWithResponders();
    return res.status(200).json({ success: true, data: hospitals });
  } catch (err) {
    console.error("Get hospitals full error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { getHospitals, addHospital, updateCapacity, getHospitalsFull };
