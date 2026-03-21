const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
});
app.use(limiter);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "API Gateway is running",
    services: {
      auth: process.env.AUTH_SERVICE_URL,
      incident: process.env.INCIDENT_SERVICE_URL,
      dispatch: process.env.DISPATCH_SERVICE_URL,
      analytics: process.env.ANALYTICS_SERVICE_URL,
    },
  });
});

// Service directory
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head><title>Emergency Platform — API Gateway</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h1>🚨 National Emergency Response Platform</h1>
        <h3>API Gateway — Port 3000</h3>
        <hr/>
        <h4>Service Documentation</h4>
        <ul>
          <li><a href="http://localhost:3001/api-docs">Auth Service Swagger</a></li>
          <li><a href="http://localhost:3002/api-docs">Incident Service Swagger</a></li>
          <li><a href="http://localhost:3003/api-docs">Dispatch Service Swagger</a></li>
          <li><a href="http://localhost:3004/api-docs">Analytics Service Swagger</a></li>
        </ul>
        <hr/>
        <p>All requests should be routed through <strong>http://localhost:3000</strong></p>
      </body>
    </html>
  `);
});

// Proxy options factory
const proxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`❌ Proxy error → ${target}:`, err.message);
        res.status(502).json({
          success: false,
          message: `Service unavailable: ${err.message}`,
        });
      },
      proxyReq: (proxyReq, req) => {
        proxyReq.path = req.originalUrl;
        console.log(`→ Proxying ${req.method} ${req.originalUrl} to ${target}`);
      },
    },
  });

// Proxy routes
app.use("/api/auth", proxy(process.env.AUTH_SERVICE_URL));
app.use("/api/incidents", proxy(process.env.INCIDENT_SERVICE_URL));
app.use("/api/responders", proxy(process.env.INCIDENT_SERVICE_URL));
app.use("/api/hospitals", proxy(process.env.INCIDENT_SERVICE_URL));
app.use("/api/vehicles", proxy(process.env.DISPATCH_SERVICE_URL));
app.use("/api/dispatches", proxy(process.env.DISPATCH_SERVICE_URL));
app.use("/api/analytics", proxy(process.env.ANALYTICS_SERVICE_URL));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port http://localhost:${PORT}`);
  console.log(`📡 Proxying to:`);
  console.log(`   Auth      → ${process.env.AUTH_SERVICE_URL}`);
  console.log(`   Incident  → ${process.env.INCIDENT_SERVICE_URL}`);
  console.log(`   Dispatch  → ${process.env.DISPATCH_SERVICE_URL}`);
  console.log(`   Analytics → ${process.env.ANALYTICS_SERVICE_URL}`);
});
