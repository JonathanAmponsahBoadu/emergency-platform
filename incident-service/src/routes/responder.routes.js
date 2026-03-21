const express = require("express");
const router = express.Router();
const {
  getResponders,
  registerResponder,
  updateResponderById,
} = require("../controllers/responder.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Responders
 *   description: Emergency responder management
 */

/**
 * @swagger
 * /api/responders:
 *   get:
 *     summary: List all responders
 *     tags: [Responders]
 *     responses:
 *       200:
 *         description: List of responders
 */
router.get("/", authenticate, getResponders);

/**
 * @swagger
 * /api/responders:
 *   post:
 *     summary: Register a new responder
 *     tags: [Responders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ambulance, fire_truck, police]
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               hospital_id:
 *                 type: string
 *               contact_phone:
 *                 type: string
 *               region:
 *                 type: string
 *     responses:
 *       201:
 *         description: Responder registered
 */
router.post(
  "/",
  authenticate,
  authorize("police_admin", "fire_admin", "hospital_admin", "system_admin"),
  registerResponder,
);

/**
 * @swagger
 * /api/responders/{id}:
 *   put:
 *     summary: Update responder availability or details
 *     tags: [Responders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               is_available:
 *                 type: boolean
 *               contact_phone:
 *                 type: string
 *               region:
 *                 type: string
 *     responses:
 *       200:
 *         description: Responder updated
 *       404:
 *         description: Responder not found
 */
router.put(
  "/:id",
  authenticate,
  authorize("police_admin", "fire_admin", "hospital_admin", "system_admin"),
  updateResponderById,
);

module.exports = router;
