const express = require("express");
const router = express.Router();
const {
  registerVehicle,
  getVehicles,
  getVehicle,
  getVehicleLocation,
  getVehicleHistory,
  pushVehicleLocation,
  assignDriver,
} = require("../controllers/vehicle.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle registration and GPS tracking
 */

/**
 * @swagger
 * /api/vehicles/register:
 *   post:
 *     summary: Register a new vehicle
 *     tags: [Vehicles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate_number, vehicle_type]
 *             properties:
 *               plate_number:
 *                 type: string
 *               vehicle_type:
 *                 type: string
 *                 enum: [ambulance, police, fire_truck]
 *               station_id:
 *                 type: string
 *               driver_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle registered
 */
router.post(
  "/register",
  authenticate,
  authorize("police_admin", "fire_admin", "hospital_admin", "system_admin"),
  registerVehicle,
);

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: List all vehicles and status
 *     tags: [Vehicles]
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get("/", authenticate, getVehicles);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle details
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vehicle details
 *       404:
 *         description: Vehicle not found
 */
router.get("/:id", authenticate, getVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/location:
 *   get:
 *     summary: Get current vehicle location from Redis cache
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Current vehicle location
 *       404:
 *         description: Vehicle not found
 */
router.get("/:id/location", authenticate, getVehicleLocation);

/**
 * @swagger
 * /api/vehicles/{id}/location:
 *   post:
 *     summary: Driver GPS ping — updates Redis, DB and broadcasts via WebSocket
 *     tags: [Vehicles]
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
 *             required: [lat, lng]
 *             properties:
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               speed_kmh:
 *                 type: number
 *               incident_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated
 */
router.post(
  "/:id/location",
  authenticate,
  authorize("ambulance_driver", "system_admin"),
  (req, res) => {
    const io = req.app.get("io");
    pushVehicleLocation(req, res, io);
  },
);

/**
 * @swagger
 * /api/vehicles/{id}/history:
 *   get:
 *     summary: Get full location history for a vehicle
 *     tags: [Vehicles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Location history
 */
router.get(
  "/:id/history",
  authenticate,
  authorize("system_admin"),
  getVehicleHistory,
);

/**
 * @swagger
 * /api/vehicles/{id}/assign:
 *   patch:
 *     summary: Assign or unassign a driver to a vehicle
 *     tags: [Vehicles]
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
 *               driver_id:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Assignment updated
 */
router.patch(
  "/:id/assign",
  authenticate,
  authorize("ambulance_driver", "police_driver", "fire_driver", "system_admin"),
  assignDriver
);

module.exports = router;
