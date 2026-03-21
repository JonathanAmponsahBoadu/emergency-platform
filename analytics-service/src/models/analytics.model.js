const pool = require("../config/db");

// ─── Incident Snapshots ───
const upsertIncidentSnapshot = async (data) => {
  const { incident_id, incident_type, region, latitude, longitude, status } =
    data;
  await pool.query(
    `INSERT INTO incident_snapshots 
       (incident_id, incident_type, region, latitude, longitude, status, last_seen)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (incident_id) DO UPDATE SET
       status = EXCLUDED.status,
       last_seen = NOW()`,
    [
      incident_id,
      incident_type,
      region || "Unknown",
      latitude,
      longitude,
      status || "created",
    ],
  );
};

const updateSnapshotStatus = async (incident_id, status) => {
  await pool.query(
    `UPDATE incident_snapshots SET status = $1, last_seen = NOW()
     WHERE incident_id = $2`,
    [status, incident_id],
  );
};

const updateSnapshotResponseTime = async (incident_id, responseTimeSec) => {
  await pool.query(
    `UPDATE incident_snapshots SET response_time_sec = $1, last_seen = NOW()
     WHERE incident_id = $2`,
    [responseTimeSec, incident_id],
  );
};

// ─── Response Metrics ───
const insertResponseMetric = async (data) => {
  const { incident_id, responder_type, responder_id, dispatch_time } = data;
  await pool.query(
    `INSERT INTO response_metrics (incident_id, responder_type, responder_id, dispatch_time)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [incident_id, responder_type, responder_id, dispatch_time],
  );
};

const updateResponseMetricArrival = async (
  incident_id,
  arrival_time,
  response_time_sec,
) => {
  await pool.query(
    `UPDATE response_metrics SET arrival_time = $1
     WHERE incident_id = $2`,
    [arrival_time, incident_id],
  );
};

const updateResponseMetricDuration = async (incident_id, duration_sec) => {
  await pool.query(
    `UPDATE response_metrics SET duration_sec = $1
     WHERE incident_id = $2`,
    [duration_sec, incident_id],
  );
};

// ─── Hospital Capacity ───
const insertHospitalCapacityLog = async (data) => {
  const { hospital_id, hospital_name, total_beds, available_beds } = data;
  await pool.query(
    `INSERT INTO hospital_capacity_log (hospital_id, hospital_name, total_beds, available_beds)
     VALUES ($1, $2, $3, $4)`,
    [hospital_id, hospital_name, total_beds, available_beds],
  );
};

// ─── Resource Utilization ───
const upsertResourceUtilization = async (data) => {
  const { responder_id, responder_name, responder_type } = data;
  await pool.query(
    `INSERT INTO resource_utilization (responder_id, responder_name, responder_type, deployments_count, period)
     VALUES ($1, $2, $3, 1, CURRENT_DATE)
     ON CONFLICT DO NOTHING`,
    [responder_id, responder_name || "Unknown", responder_type || "Unknown"],
  );

  await pool.query(
    `UPDATE resource_utilization SET deployments_count = deployments_count + 1
     WHERE responder_id = $1 AND period = CURRENT_DATE`,
    [responder_id],
  );
};

// ─── Analytics Queries ───
const getResponseTimes = async () => {
  const result = await pool.query(
    `SELECT 
       i.incident_type,
       i.region,
       COUNT(*) as total_incidents,
       AVG(r.duration_sec) as avg_duration_sec,
       MIN(r.duration_sec) as min_duration_sec,
       MAX(r.duration_sec) as max_duration_sec
     FROM incident_snapshots i
     LEFT JOIN response_metrics r ON i.incident_id = r.incident_id
     WHERE r.duration_sec IS NOT NULL
     GROUP BY i.incident_type, i.region
     ORDER BY avg_duration_sec DESC`,
  );
  return result.rows;
};

const getIncidentsByRegion = async () => {
  const result = await pool.query(
    `SELECT 
       region,
       incident_type,
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
       COUNT(CASE WHEN status != 'resolved' THEN 1 END) as active
     FROM incident_snapshots
     GROUP BY region, incident_type
     ORDER BY total DESC`,
  );
  return result.rows;
};

const getResourceUtilization = async () => {
  const result = await pool.query(
    `SELECT 
       responder_id,
       responder_name,
       responder_type,
       SUM(deployments_count) as total_deployments,
       MAX(period) as last_active
     FROM resource_utilization
     GROUP BY responder_id, responder_name, responder_type
     ORDER BY total_deployments DESC`,
  );
  return result.rows;
};

const getHospitalCapacity = async () => {
  const result = await pool.query(
    `SELECT 
       hospital_id,
       hospital_name,
       AVG(available_beds) as avg_available_beds,
       MIN(available_beds) as min_available_beds,
       MAX(total_beds) as total_beds,
       COUNT(*) as total_records,
       MAX(recorded_at) as last_updated
     FROM hospital_capacity_log
     GROUP BY hospital_id, hospital_name
     ORDER BY avg_available_beds ASC`,
  );
  return result.rows;
};

const getIncidentsSummary = async () => {
  const result = await pool.query(
    `SELECT
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'created' THEN 1 END) as created,
       COUNT(CASE WHEN status = 'dispatched' THEN 1 END) as dispatched,
       COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
       COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
       COUNT(CASE WHEN incident_type = 'medical' THEN 1 END) as medical,
       COUNT(CASE WHEN incident_type = 'fire' THEN 1 END) as fire,
       COUNT(CASE WHEN incident_type = 'crime' THEN 1 END) as crime,
       COUNT(CASE WHEN incident_type = 'accident' THEN 1 END) as accident,
       COUNT(CASE WHEN incident_type = 'other' THEN 1 END) as other
     FROM incident_snapshots`,
  );
  return result.rows[0];
};

const getTopResponders = async () => {
  const result = await pool.query(
    `SELECT 
       responder_id,
       responder_name,
       responder_type,
       SUM(deployments_count) as total_deployments
     FROM resource_utilization
     GROUP BY responder_id, responder_name, responder_type
     ORDER BY total_deployments DESC
     LIMIT 10`,
  );
  return result.rows;
};

module.exports = {
  upsertIncidentSnapshot,
  updateSnapshotStatus,
  updateSnapshotResponseTime,
  insertResponseMetric,
  updateResponseMetricArrival,
  updateResponseMetricDuration,
  insertHospitalCapacityLog,
  upsertResourceUtilization,
  getResponseTimes,
  getIncidentsByRegion,
  getResourceUtilization,
  getHospitalCapacity,
  getIncidentsSummary,
  getTopResponders,
};
