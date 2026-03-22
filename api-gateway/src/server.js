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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Emergency Platform — API Gateway</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0d0d0f;
          color: #e2e2e2;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
        }

        .container {
          width: 100%;
          max-width: 680px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(226,75,74,0.12);
          border: 1px solid rgba(226,75,74,0.25);
          border-radius: 20px;
          padding: 5px 14px;
          font-size: 11px;
          color: #e24b4a;
          letter-spacing: 0.06em;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #e24b4a;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 10px;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 14px;
          color: #666;
          line-height: 1.6;
        }

        .subtitle span {
          color: #888;
        }

        .divider {
          height: 1px;
          background: #1e1e22;
          margin: 32px 0;
        }

        .section-title {
          font-size: 11px;
          color: #555;
          letter-spacing: 0.08em;
          font-weight: 600;
          margin-bottom: 14px;
        }

        .services {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 32px;
        }

        .service-card {
          background: #13131a;
          border: 1px solid #1e1e26;
          border-radius: 12px;
          padding: 16px;
          text-decoration: none;
          transition: border-color 0.2s, transform 0.2s;
          display: block;
        }

        .service-card:hover {
          border-color: #333;
          transform: translateY(-1px);
        }

        .service-card .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .service-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .service-card .arrow {
          font-size: 14px;
          color: #333;
          transition: color 0.2s;
        }

        .service-card:hover .arrow {
          color: #666;
        }

        .service-name {
          font-size: 13px;
          font-weight: 600;
          color: #e2e2e2;
          margin-bottom: 3px;
        }

        .service-desc {
          font-size: 11px;
          color: #555;
        }

        .service-url {
          font-size: 10px;
          color: #444;
          margin-top: 8px;
          font-family: 'Courier New', monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .routes {
          background: #13131a;
          border: 1px solid #1e1e26;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
        }

        .route-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #1a1a20;
        }

        .route-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .route-row:first-child {
          padding-top: 0;
        }

        .method {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 4px;
          letter-spacing: 0.04em;
          min-width: 44px;
          text-align: center;
        }

        .method.all {
          background: rgba(55,138,221,0.12);
          color: #378add;
          border: 1px solid rgba(55,138,221,0.2);
        }

        .route-path {
          font-size: 12px;
          font-family: 'Courier New', monospace;
          color: #888;
          flex: 1;
        }

        .route-target {
          font-size: 11px;
          color: #444;
        }

        .footer {
          text-align: center;
          font-size: 11px;
          color: #333;
          line-height: 1.8;
        }

        .footer a {
          color: #444;
          text-decoration: none;
        }

        .footer a:hover {
          color: #666;
        }

        .gateway-url {
          display: inline-block;
          background: #13131a;
          border: 1px solid #1e1e26;
          border-radius: 6px;
          padding: 4px 10px;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">

        <div class="header">
          <div class="badge">
            <div class="dot"></div>
            LIVE
          </div>
          <h1>🚨 National Emergency Response Platform</h1>
          <p class="subtitle">
            API Gateway — University of Ghana · CPEN 421<br/>
            <span>Group 14 · Kumi Kelvin Gyabaah & Amponsah Jonathan Boadu</span>
          </p>
        </div>

        <div class="divider"></div>

        <p class="section-title">MICROSERVICES — SWAGGER DOCUMENTATION</p>
        <div class="services">
          <a href="${process.env.AUTH_SERVICE_URL}/api-docs" target="_blank" class="service-card">
            <div class="top">
              <div class="service-icon" style="background:rgba(226,75,74,0.1);border:1px solid rgba(226,75,74,0.2);">🔐</div>
              <span class="arrow">↗</span>
            </div>
            <div class="service-name">Auth Service</div>
            <div class="service-desc">Identity & JWT authentication</div>
            <div class="service-url">${process.env.AUTH_SERVICE_URL}</div>
          </a>

          <a href="${process.env.INCIDENT_SERVICE_URL}/api-docs" target="_blank" class="service-card">
            <div class="top">
              <div class="service-icon" style="background:rgba(239,159,39,0.1);border:1px solid rgba(239,159,39,0.2);">🚨</div>
              <span class="arrow">↗</span>
            </div>
            <div class="service-name">Incident Service</div>
            <div class="service-desc">Emergency incident management</div>
            <div class="service-url">${process.env.INCIDENT_SERVICE_URL}</div>
          </a>

          <a href="${process.env.DISPATCH_SERVICE_URL}/api-docs" target="_blank" class="service-card">
            <div class="top">
              <div class="service-icon" style="background:rgba(55,138,221,0.1);border:1px solid rgba(55,138,221,0.2);">📡</div>
              <span class="arrow">↗</span>
            </div>
            <div class="service-name">Dispatch Service</div>
            <div class="service-desc">GPS tracking & WebSockets</div>
            <div class="service-url">${process.env.DISPATCH_SERVICE_URL}</div>
          </a>

          <a href="${process.env.ANALYTICS_SERVICE_URL}/api-docs" target="_blank" class="service-card">
            <div class="top">
              <div class="service-icon" style="background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);">📊</div>
              <span class="arrow">↗</span>
            </div>
            <div class="service-name">Analytics Service</div>
            <div class="service-desc">Reports & monitoring</div>
            <div class="service-url">${process.env.ANALYTICS_SERVICE_URL}</div>
          </a>
        </div>

        <p class="section-title">PROXY ROUTING</p>
        <div class="routes">
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/auth/*</span>
            <span class="route-target">→ Auth Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/incidents/*</span>
            <span class="route-target">→ Incident Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/responders/*</span>
            <span class="route-target">→ Incident Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/hospitals/*</span>
            <span class="route-target">→ Incident Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/vehicles/*</span>
            <span class="route-target">→ Dispatch Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/dispatches/*</span>
            <span class="route-target">→ Dispatch Service</span>
          </div>
          <div class="route-row">
            <span class="method all">ALL</span>
            <span class="route-path">/api/analytics/*</span>
            <span class="route-target">→ Analytics Service</span>
          </div>
        </div>

        <div class="footer">
          <p>All API requests should be routed through the gateway</p>
          <div class="gateway-url">https://emergency-api-gateway.onrender.com</div>
          <br/>
          <p style="margin-top:16px;">
            <a href="/health">Health Check</a> · CPEN 421 · First Semester 2025/2026
          </p>
        </div>

      </div>
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
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Proxying to:`);
  console.log(`   Auth      → ${process.env.AUTH_SERVICE_URL}`);
  console.log(`   Incident  → ${process.env.INCIDENT_SERVICE_URL}`);
  console.log(`   Dispatch  → ${process.env.DISPATCH_SERVICE_URL}`);
  console.log(`   Analytics → ${process.env.ANALYTICS_SERVICE_URL}`);
});
