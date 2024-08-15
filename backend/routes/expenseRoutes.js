const express = require("express");
const {
  authenticateToken,
  authorizeRole,
} = require("../config/authMiddleware");
const {
  logExpense,
  generateExpenseReport,
} = require("../controllers/expenseController");
const router = express.Router();

// Route for logging expenses
router.post(
  "/log",
  authenticateToken,
  authorizeRole(["Admin", "PropertyManager"]),
  logExpense
);

// Route for generating expense reports
router.get(
  "/report",
  authenticateToken,
  authorizeRole(["Admin"]),
  generateExpenseReport
);

module.exports = router;
