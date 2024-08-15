const express = require("express");
const {
  addProperty,
  getProperties,
  updateProperty,
  deleteProperty,
  getVacantProperties,
} = require("../controllers/propertyController");
const {
  authenticate,
  isPropertyManager,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Routes for property management
router.get("/", authenticate, getProperties); // Get all properties
router.get("/vacant", authenticate, getVacantProperties); // Get vacant properties with optional filtering
router.post("/", authenticate, isPropertyManager, addProperty); // Add a new property
router.put("/:id", authenticate, isPropertyManager, updateProperty); // Update a property
router.delete("/:id", authenticate, isPropertyManager, deleteProperty); // Delete a property

module.exports = router;
