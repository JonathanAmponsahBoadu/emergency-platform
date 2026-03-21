const express = require("express");
const router = express.Router();
const {
  getHospitals,
  addHospital,
  updateCapacity,
} = require("../controllers/hospital.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: Hospital capacity management
 */

/**
 * @swagger
 * /api/hospitals:
 *   get:
 *     summary: List all hospitals with bed counts
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: List of hospitals
 */
router.get("/", authenticate, getHospitals);

/**
 * @swagger
 * /api/hospitals:
 *   post:
 *     summary: Create a new hospital
 *     tags: [Hospitals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, latitude, longitude]
 *             properties:
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               total_beds:
 *                 type: integer
 *               available_beds:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Hospital created
 */
router.post(
  "/",
  authenticate,
  authorize("hospital_admin", "system_admin"),
  addHospital,
);

/**
 * @swagger
 * /api/hospitals/{id}/capacity:
 *   put:
 *     summary: Update hospital bed availability
 *     tags: [Hospitals]
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
 *             properties:
 *               total_beds:
 *                 type: integer
 *               available_beds:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Capacity updated
 *       404:
 *         description: Hospital not found
 */
router.put(
  "/:id/capacity",
  authenticate,
  authorize("hospital_admin", "system_admin"),
  updateCapacity,
);

module.exports = router;
