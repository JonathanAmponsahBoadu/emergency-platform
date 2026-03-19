const pool = require("../config/db");

const createUser = async (name, email, passwordHash, role) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, email, passwordHash, role],
  );
  return result.rows[0];
};

const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1 AND is_active = true`,
    [email],
  );
  return result.rows[0];
};

const findUserById = async (userId) => {
  const result = await pool.query(
    `SELECT user_id, name, email, role, is_active, created_at 
     FROM users WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0];
};

const getAllUsers = async () => {
  const result = await pool.query(
    `SELECT user_id, name, email, role, is_active, created_at 
     FROM users ORDER BY created_at DESC`,
  );
  return result.rows;
};

const updateUser = async (userId, fields) => {
  const { name, role, is_active } = fields;
  const result = await pool.query(
    `UPDATE users SET name = COALESCE($1, name), 
     role = COALESCE($2, role), 
     is_active = COALESCE($3, is_active),
     updated_at = NOW()
     WHERE user_id = $4 RETURNING *`,
    [name, role, is_active, userId],
  );
  return result.rows[0];
};

const saveRefreshToken = async (userId, tokenHash, expiresAt) => {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );
};

const findRefreshToken = async (tokenHash) => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens 
     WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash],
  );
  return result.rows[0];
};

const deleteRefreshToken = async (tokenHash) => {
  await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [
    tokenHash,
  ]);
};

const logAction = async (userId, action, ipAddress) => {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, ip_address) 
     VALUES ($1, $2, $3)`,
    [userId, action, ipAddress],
  );
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  logAction,
};
