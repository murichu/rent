const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../config/authMiddleware");
const {
  generateRentInvoice,
  getRentInvoices,
  updateRentStatus,
} = require("../controllers/rentController");

const router = express.Router();

// Route for creating rent invoices
router.post(
  "/invoice",
  authenticateToken,
  authorizeRole(["Admin", "PropertyManager"]),
  generateRentInvoice
);

// Routes for rent management
router.post(
  "/",
  authenticateToken,
  authorizeRole(["PropertyManager"]),
  generateRentInvoice
);
router.get("/", authenticateToken, getRentInvoices);
router.put(
  "/:id",
  authenticateToken,
  authorizeRole(["PropertyManager"]),
  updateRentStatus
);

module.exports = router;
