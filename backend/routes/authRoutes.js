const express = require("express");
const {
  registerUser,
  loginUser,
  sendOtp,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// Routes for authentication
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-otp", authenticate, sendOtp);

module.exports = router;
