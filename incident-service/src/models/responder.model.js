const pool = require("../config/db");

const getAllResponders = async () => {
  const result = await pool.query(
    `SELECT r.*, h.name as hospital_name 
     FROM responders r
     LEFT JOIN hospitals h ON r.hospital_id = h.hospital_id
     ORDER BY r.created_at DESC`,
  );
  return result.rows;
};

const getAvailableRespondersByType = async (type) => {
  const result = await pool.query(
    `SELECT * FROM responders 
     WHERE type = $1 AND is_available = true`,
    [type],
  );
  return result.rows;
};

const getResponderById = async (responderId) => {
  const result = await pool.query(
    `SELECT * FROM responders WHERE responder_id = $1`,
    [responderId],
  );
  return result.rows[0];
};

const createResponder = async (data) => {
  const {
    name,
    type,
    latitude,
    longitude,
    hospital_id,
    contact_phone,
    region,
    driver_id,
  } = data;
  const result = await pool.query(
    `INSERT INTO responders (name, type, latitude, longitude, hospital_id, contact_phone, region, driver_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      name,
      type,
      latitude,
      longitude,
      hospital_id || null,
      contact_phone,
      region,
      driver_id || null,
    ],
  );
  return result.rows[0];
};

const updateResponderAvailability = async (responderId, isAvailable) => {
  const result = await pool.query(
    `UPDATE responders SET is_available = $1, updated_at = NOW()
     WHERE responder_id = $2 RETURNING *`,
    [isAvailable, responderId],
  );
  return result.rows[0];
};

const updateResponder = async (responderId, data) => {
  const { name, latitude, longitude, is_available, contact_phone, region, driver_id } =
    data;
  const result = await pool.query(
    `UPDATE responders SET
       name = COALESCE($1, name),
       latitude = COALESCE($2, latitude),
       longitude = COALESCE($3, longitude),
       is_available = COALESCE($4, is_available),
       contact_phone = COALESCE($5, contact_phone),
       region = COALESCE($6, region),
       driver_id = COALESCE($7, driver_id),
       updated_at = NOW()
     WHERE responder_id = $8 RETURNING *`,
    [
      name,
      latitude,
      longitude,
      is_available,
      contact_phone,
      region,
      driver_id,
      responderId,
    ],
  );
  return result.rows[0];
};

module.exports = {
  getAllResponders,
  getAvailableRespondersByType,
  getResponderById,
  createResponder,
  updateResponderAvailability,
  updateResponder,
};
