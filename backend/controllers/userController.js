// backend/controllers/userController.js
const User = require("../models/userModel");
const bcrypt = require("bcrypt");

// Handle user login
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({ message: "Logged in successfully" });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

module.exports = { loginUser };
