const pool = require("../config/db");

const getAllVehicles = async () => {
  const result = await pool.query(
    `SELECT * FROM vehicles ORDER BY created_at DESC`,
  );
  return result.rows;
};

const getVehicleById = async (vehicleId) => {
  const result = await pool.query(
    `SELECT * FROM vehicles WHERE vehicle_id = $1`,
    [vehicleId],
  );
  return result.rows[0];
};

const createVehicle = async (data) => {
  const { plate_number, vehicle_type, station_id, driver_id } = data;
  const result = await pool.query(
    `INSERT INTO vehicles (plate_number, vehicle_type, station_id, driver_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [plate_number, vehicle_type, station_id || null, driver_id || null],
  );
  return result.rows[0];
};

const updateVehicleLocation = async (vehicleId, lat, lng) => {
  const result = await pool.query(
    `UPDATE vehicles SET
       current_lat = $1,
       current_lng = $2,
       last_seen = NOW(),
       updated_at = NOW()
     WHERE vehicle_id = $3 RETURNING *`,
    [lat, lng, vehicleId],
  );
  return result.rows[0];
};

const updateVehicleStatus = async (vehicleId, status) => {
  const result = await pool.query(
    `UPDATE vehicles SET status = $1, updated_at = NOW()
     WHERE vehicle_id = $2 RETURNING *`,
    [status, vehicleId],
  );
  return result.rows[0];
};

const assignDriverToVehicle = async (vehicleId, driverId) => {
  const result = await pool.query(
    `UPDATE vehicles SET driver_id = $1, updated_at = NOW()
     WHERE vehicle_id = $2 RETURNING *`,
    [driverId || null, vehicleId],
  );
  return result.rows[0];
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicleLocation,
  updateVehicleStatus,
  assignDriverToVehicle,
};
