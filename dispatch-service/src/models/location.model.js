const pool = require("../config/db");

const saveLocationHistory = async (
  vehicleId,
  dispatchId,
  lat,
  lng,
  speedKmh,
) => {
  const result = await pool.query(
    `INSERT INTO location_history (vehicle_id, dispatch_id, latitude, longitude, speed_kmh)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [vehicleId, dispatchId || null, lat, lng, speedKmh || 0],
  );
  return result.rows[0];
};

const getLocationHistory = async (vehicleId) => {
  const result = await pool.query(
    `SELECT * FROM location_history
     WHERE vehicle_id = $1
     ORDER BY recorded_at DESC
     LIMIT 100`,
    [vehicleId],
  );
  return result.rows;
};

module.exports = { saveLocationHistory, getLocationHistory };
