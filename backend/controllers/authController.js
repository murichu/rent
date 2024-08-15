const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");

// Register a new user
const registerUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      role,
    });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: "Failed to login" });
  }
};

// Send OTP for 2FA
const sendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    await sendEmail(email, "Your OTP Code", `Your OTP code is ${otp}`);
    res.json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

module.exports = { registerUser, loginUser, sendOtp };
