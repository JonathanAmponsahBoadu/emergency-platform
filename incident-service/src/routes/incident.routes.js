const express = require("express");
const router = express.Router();
const {
  createNewIncident,
  getIncidents,
  getOpenIncidentsList,
  getIncident,
  updateStatus,
  assignResponder,
} = require("../controllers/incident.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Incidents
 *   description: Emergency incident management
 */

/**
 * @swagger
 * /api/incidents:
 *   post:
 *     summary: Create a new incident and auto-dispatch nearest responder
 *     tags: [Incidents]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [citizen_name, incident_type, latitude, longitude]
 *             properties:
 *               citizen_name:
 *                 type: string
 *               incident_type:
 *                 type: string
 *                 enum: [medical, fire, crime, accident, other]
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Incident created and responder dispatched
 *       503:
 *         description: No available responders
 */
router.post("/", authenticate, authorize("system_admin"), createNewIncident);

/**
 * @swagger
 * /api/incidents:
 *   get:
 *     summary: List all incidents with optional filters
 *     tags: [Incidents]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [created, dispatched, in_progress, resolved]
 *       - in: query
 *         name: incident_type
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of incidents
 */
router.get("/", authenticate, authorize("system_admin"), getIncidents);

/**
 * @swagger
 * /api/incidents/open:
 *   get:
 *     summary: Get all active non-resolved incidents
 *     tags: [Incidents]
 *     responses:
 *       200:
 *         description: List of open incidents
 */
router.get("/open", authenticate, getOpenIncidentsList);

/**
 * @swagger
 * /api/incidents/{id}:
 *   get:
 *     summary: Get single incident details
 *     tags: [Incidents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Incident details
 *       404:
 *         description: Incident not found
 */
router.get("/:id", authenticate, getIncident);

/**
 * @swagger
 * /api/incidents/{id}/status:
 *   put:
 *     summary: Update incident status
 *     tags: [Incidents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [created, dispatched, in_progress, resolved]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Incident not found
 */
router.put("/:id/status", authenticate, updateStatus);

/**
 * @swagger
 * /api/incidents/{id}/assign:
 *   put:
 *     summary: Manually reassign a responder to an incident
 *     tags: [Incidents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [responder_id]
 *             properties:
 *               responder_id:
 *                 type: string
 *               hospital_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Responder assigned
 *       404:
 *         description: Incident or responder not found
 */
router.put(
  "/:id/assign",
  authenticate,
  authorize("system_admin"),
  assignResponder,
);

module.exports = router;
