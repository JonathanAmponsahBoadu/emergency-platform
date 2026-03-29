const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  createUser,
  findUserByEmail,
  findUserById,
  getAllUsers,
  updateUser,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  logAction,
} = require("../models/user.model");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "24h";
const REFRESH_EXPIRES_IN = "7d";

const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, role: user.role, hospitalId: user.hospital_id },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, role, hospital_id } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, passwordHash, role, hospital_id);

    await logAction(user.user_id, "USER_REGISTERED", req.ip);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospital_id: user.hospital_id,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await saveRefreshToken(user.user_id, refreshTokenHash, expiresAt);
    await logAction(user.user_id, "USER_LOGIN", req.ip);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role,
          hospital_id: user.hospital_id,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const storedToken = await findRefreshToken(tokenHash);

    if (!storedToken) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired refresh token" });
    }

    const user = await findUserById(storedToken.user_id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res
        .status(400)
        .json({ success: false, message: "Refresh token required" });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    await deleteRefreshToken(tokenHash);

    await logAction(req.user?.userId, "USER_LOGOUT", req.ip);

    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/auth/profile
const getProfile = async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("Profile error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// GET /api/auth/users
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error("Get users error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// PUT /api/auth/users/:id
const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;

    const updated = await updateUser(id, fields);
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "User updated", data: updated });
  } catch (err) {
    console.error("Update user error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// DELETE /api/auth/users/:id (deactivate)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await updateUser(id, { is_active: false });

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "User deactivated" });
  } catch (err) {
    console.error("Deactivate user error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// POST /api/auth/verify-token (internal use)
const verifyToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, valid: false });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      user: {
        userId: user.user_id,
        role: user.role,
        name: user.name,
        hospital_id: user.hospital_id,
      },
    });
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, valid: false, message: "Invalid token" });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  getUsers,
  updateUserById,
  deactivateUser,
  verifyToken,
};
