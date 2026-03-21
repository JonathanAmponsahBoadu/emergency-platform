const pool = require("../config/db");

const createDispatch = async (vehicleId, incidentId) => {
  const result = await pool.query(
    `INSERT INTO dispatches (vehicle_id, incident_id, status)
     VALUES ($1, $2, 'dispatched') RETURNING *`,
    [vehicleId, incidentId],
  );
  return result.rows[0];
};

const getAllDispatches = async () => {
  const result = await pool.query(
    `SELECT d.*, v.plate_number, v.vehicle_type
     FROM dispatches d
     LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
     ORDER BY d.created_at DESC`,
  );
  return result.rows;
};

const getDispatchById = async (dispatchId) => {
  const result = await pool.query(
    `SELECT d.*, v.plate_number, v.vehicle_type
     FROM dispatches d
     LEFT JOIN vehicles v ON d.vehicle_id = v.vehicle_id
     WHERE d.dispatch_id = $1`,
    [dispatchId],
  );
  return result.rows[0];
};

const getDispatchByIncidentId = async (incidentId) => {
  const result = await pool.query(
    `SELECT * FROM dispatches WHERE incident_id = $1`,
    [incidentId],
  );
  return result.rows[0];
};

const updateDispatchStatus = async (dispatchId, status) => {
  let query = `UPDATE dispatches SET status = $1, updated_at = NOW()`;
  const params = [status, dispatchId];

  if (status === "on_scene") {
    query = `UPDATE dispatches SET status = $1, arrived_at = NOW(), updated_at = NOW()`;
  } else if (status === "completed") {
    query = `UPDATE dispatches SET status = $1, resolved_at = NOW(),
             response_time_sec = EXTRACT(EPOCH FROM (NOW() - dispatched_at))::INT,
             updated_at = NOW()`;
  }

  query += ` WHERE dispatch_id = $2 RETURNING *`;
  const result = await pool.query(query, params);
  return result.rows[0];
};

module.exports = {
  createDispatch,
  getAllDispatches,
  getDispatchById,
  getDispatchByIncidentId,
  updateDispatchStatus,
};
