const jwt = require("jsonwebtoken");

// Middleware for checking if the user is authenticated
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = decoded;
    next();
  });
};

// Middleware for checking if the user is an admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "Admin")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

// Middleware for checking if the user is a property manager
const isPropertyManager = (req, res, next) => {
  if (req.user.role !== "Property Manager")
    return res.status(403).json({ error: "Forbidden" });
  next();
};

module.exports = { authenticate, isAdmin, isPropertyManager };
