import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return res.status(401).json({ error: "Invalid Authorization format" });
  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret);
    
    // Support both user and agent authentication
    if (payload.userType === "agent") {
      req.agent = payload;
      req.userType = "agent";
    } else {
      req.user = payload;
      req.userType = "user";
    }
    
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  // Support both user admin and agent manager roles
  if (req.userType === "user" && req.user?.role === "ADMIN") {
    return next();
  }
  
  if (req.userType === "agent" && req.agent?.role === "AGENT_MANAGER") {
    return next();
  }
  
  return res.status(403).json({ error: "Admin or Agent Manager role required" });
}

// Alias for compatibility
export const authenticateToken = requireAuth;
