const pool = require("../config/db");

const getAllHospitals = async () => {
  const result = await pool.query(`SELECT * FROM hospitals ORDER BY name ASC`);
  return result.rows;
};

const getHospitalById = async (hospitalId) => {
  const result = await pool.query(
    `SELECT * FROM hospitals WHERE hospital_id = $1`,
    [hospitalId],
  );
  return result.rows[0];
};

const getAvailableHospitals = async () => {
  const result = await pool.query(
    `SELECT * FROM hospitals WHERE available_beds > 0 ORDER BY available_beds DESC`,
  );
  return result.rows;
};

const createHospital = async (data) => {
  const { name, latitude, longitude, total_beds, available_beds } = data;
  const result = await pool.query(
    `INSERT INTO hospitals (name, latitude, longitude, total_beds, available_beds)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, latitude, longitude, total_beds, available_beds],
  );
  return result.rows[0];
};

const updateHospitalCapacity = async (hospitalId, totalBeds, availableBeds) => {
  const result = await pool.query(
    `UPDATE hospitals SET
       total_beds = COALESCE($1, total_beds),
       available_beds = COALESCE($2, available_beds),
       updated_at = NOW()
     WHERE hospital_id = $3 RETURNING *`,
    [totalBeds, availableBeds, hospitalId],
  );
  return result.rows[0];
};

const getHospitalsWithResponders = async () => {
  const result = await pool.query(`
    SELECT 
      h.*,
      COALESCE(
        json_agg(r.*) FILTER (WHERE r.responder_id IS NOT NULL),
        '[]'
      ) as responders
    FROM hospitals h
    LEFT JOIN responders r ON h.hospital_id = r.hospital_id
    GROUP BY h.hospital_id
    ORDER BY h.name ASC
  `);
  return result.rows;
};

module.exports = {
  getAllHospitals,
  getHospitalById,
  getAvailableHospitals,
  createHospital,
  updateHospitalCapacity,
  getHospitalsWithResponders,
};
