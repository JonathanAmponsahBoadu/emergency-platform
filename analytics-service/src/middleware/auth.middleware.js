const axios = require("axios");

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:3001";

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify-token`,
      { token },
    );

    if (!response.data.valid) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    req.user = response.data.user;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Token verification failed" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
