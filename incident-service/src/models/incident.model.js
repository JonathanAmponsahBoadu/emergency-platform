const pool = require("../config/db");

const createIncident = async (data) => {
  const {
    citizen_name,
    incident_type,
    latitude,
    longitude,
    notes,
    created_by,
    assigned_unit_id,
    assigned_unit_type,
    hospital_id,
  } = data;
  const result = await pool.query(
    `INSERT INTO incidents 
       (citizen_name, incident_type, latitude, longitude, notes, 
        created_by, assigned_unit_id, assigned_unit_type, hospital_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'dispatched') RETURNING *`,
    [
      citizen_name,
      incident_type,
      latitude,
      longitude,
      notes,
      created_by,
      assigned_unit_id,
      assigned_unit_type,
      hospital_id || null,
    ],
  );
  return result.rows[0];
};

const getAllIncidents = async (filters = {}) => {
  let query = `SELECT * FROM incidents`;
  const params = [];
  const conditions = [];

  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }

  if (filters.incident_type) {
    params.push(filters.incident_type);
    conditions.push(`incident_type = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY created_at DESC`;
  const result = await pool.query(query, params);
  return result.rows;
};

const getOpenIncidents = async () => {
  const result = await pool.query(
    `SELECT * FROM incidents 
     WHERE status != 'resolved' ORDER BY created_at DESC`,
  );
  return result.rows;
};

const getIncidentById = async (incidentId) => {
  const result = await pool.query(
    `SELECT i.*, r.name as responder_name, r.type as responder_type,
            h.name as hospital_name
     FROM incidents i
     LEFT JOIN responders r ON i.assigned_unit_id = r.responder_id
     LEFT JOIN hospitals h ON i.hospital_id = h.hospital_id
     WHERE i.incident_id = $1`,
    [incidentId],
  );
  return result.rows[0];
};

const updateIncidentStatus = async (incidentId, newStatus, changedBy) => {
  const current = await pool.query(
    `SELECT status FROM incidents WHERE incident_id = $1`,
    [incidentId],
  );

  if (!current.rows[0]) return null;
  const oldStatus = current.rows[0].status;

  const result = await pool.query(
    `UPDATE incidents SET status = $1, updated_at = NOW()
     WHERE incident_id = $2 RETURNING *`,
    [newStatus, incidentId],
  );

  await pool.query(
    `INSERT INTO incident_status_logs 
       (incident_id, old_status, new_status, changed_by)
     VALUES ($1, $2, $3, $4)`,
    [incidentId, oldStatus, newStatus, changedBy],
  );

  return result.rows[0];
};

const assignResponderToIncident = async (
  incidentId,
  responderId,
  responderType,
  hospitalId,
) => {
  const result = await pool.query(
    `UPDATE incidents SET
       assigned_unit_id = $1,
       assigned_unit_type = $2,
       hospital_id = $3,
       status = 'dispatched',
       updated_at = NOW()
     WHERE incident_id = $4 RETURNING *`,
    [responderId, responderType, hospitalId || null, incidentId],
  );
  return result.rows[0];
};

module.exports = {
  createIncident,
  getAllIncidents,
  getOpenIncidents,
  getIncidentById,
  updateIncidentStatus,
  assignResponderToIncident,
};
