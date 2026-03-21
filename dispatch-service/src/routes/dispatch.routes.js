const express = require("express");
const router = express.Router();
const {
  getDispatches,
  getDispatch,
  updateStatus,
} = require("../controllers/dispatch.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/**
 * @swagger
 * tags:
 *   name: Dispatches
 *   description: Dispatch management and status tracking
 */

/**
 * @swagger
 * /api/dispatches:
 *   get:
 *     summary: List all dispatch records
 *     tags: [Dispatches]
 *     responses:
 *       200:
 *         description: List of dispatches
 */
router.get("/", authenticate, authorize("system_admin"), getDispatches);

/**
 * @swagger
 * /api/dispatches/{id}:
 *   get:
 *     summary: Get single dispatch details
 *     tags: [Dispatches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dispatch details
 *       404:
 *         description: Dispatch not found
 */
router.get("/:id", authenticate, getDispatch);

/**
 * @swagger
 * /api/dispatches/{id}/status:
 *   put:
 *     summary: Update dispatch status
 *     tags: [Dispatches]
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
 *                 enum: [en_route, on_scene, returning, completed]
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Dispatch not found
 */
router.put(
  "/:id/status",
  authenticate,
  authorize("ambulance_driver", "system_admin"),
  (req, res) => {
    const io = req.app.get("io");
    updateStatus(req, res, io);
  },
);

module.exports = router;
