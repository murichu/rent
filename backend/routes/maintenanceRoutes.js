const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../config/authMiddleware");
const {
  submitMaintenanceRequest,
  updateMaintenanceStatus,
  getMaintenanceRequests,
  updateMaintenanceRequest,
} = require("../controllers/maintenanceController");

const router = express.Router();

// Route for submitting maintenance requests
// Requires authentication
router.post("/submit", authenticateToken, submitMaintenanceRequest);

// Route for updating maintenance status
// Requires authentication and authorization (Admin or PropertyManager)
router.put(
  "/update-status",
  authenticateToken,
  authorizeRole(["Admin", "PropertyManager"]),
  updateMaintenanceStatus
);

// Route to get all maintenance requests
// Requires authentication
router.get("/", authenticateToken, getMaintenanceRequests);

// Route to update maintenance request status by ID
// Requires authentication and authorization (Admin or PropertyManager)
router.put(
  "/update/:id",
  authenticateToken,
  authorizeRole(["Admin", "PropertyManager"]),
  updateMaintenanceRequest
);

module.exports = router;
