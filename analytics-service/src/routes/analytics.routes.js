const express = require("express");
const router = express.Router();
const {
  responseTimes,
  incidentsByRegion,
  resourceUtilization,
  hospitalCapacity,
  incidentsSummary,
  topResponders,
} = require("../controllers/analytics.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and monitoring endpoints
 */

/**
 * @swagger
 * /api/analytics/response-times:
 *   get:
 *     summary: Average response times by incident type and region
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Response time analytics
 */
router.get(
  "/response-times",
  authenticate,
  authorize("system_admin"),
  responseTimes,
);

/**
 * @swagger
 * /api/analytics/incidents-by-region:
 *   get:
 *     summary: Incident count by region and type
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Incidents by region
 */
router.get(
  "/incidents-by-region",
  authenticate,
  authorize("system_admin"),
  incidentsByRegion,
);

/**
 * @swagger
 * /api/analytics/resource-utilization:
 *   get:
 *     summary: Deployment frequency per responder
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Resource utilization data
 */
router.get(
  "/resource-utilization",
  authenticate,
  authorize("system_admin"),
  resourceUtilization,
);

/**
 * @swagger
 * /api/analytics/hospital-capacity:
 *   get:
 *     summary: Historical bed usage across hospitals
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Hospital capacity history
 */
router.get(
  "/hospital-capacity",
  authenticate,
  authorize("system_admin", "hospital_admin"),
  hospitalCapacity,
);

/**
 * @swagger
 * /api/analytics/incidents/summary:
 *   get:
 *     summary: High level summary of all incidents
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Incidents summary
 */
router.get("/incidents/summary", authenticate, incidentsSummary);

/**
 * @swagger
 * /api/analytics/top-responders:
 *   get:
 *     summary: Most deployed responders ranked
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Top responders
 */
router.get(
  "/top-responders",
  authenticate,
  authorize("system_admin"),
  topResponders,
);

module.exports = router;
