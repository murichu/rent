import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

// Agent authentication middleware
export function requireAgentAuth(req, res, next) {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });
  
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret);
    
    // Check if this is an agent token
    if (payload.userType !== "agent") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    req.agent = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Combined authentication middleware (supports both users and agents)
export function requireAuth(req, res, next) {
  const header = req.header("authorization") || req.header("Authorization");
  if (!header) return res.status(401).json({ error: "Missing Authorization header" });
  
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret);
    
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

// Role-based access control for agents
export function requireAgentRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.agent) {
      return res.status(401).json({ error: "Agent authentication required" });
    }

    if (!allowedRoles.includes(req.agent.role)) {
      return res.status(403).json({ 
        error: "Insufficient permissions", 
        required: allowedRoles,
        current: req.agent.role 
      });
    }

    next();
  };
}

// Permission-based access control for agents
export function requireAgentPermission(requiredPermissions) {
  return async (req, res, next) => {
    if (!req.agent) {
      return res.status(401).json({ error: "Agent authentication required" });
    }

    try {
      // Fetch current agent permissions from database
      const agent = await prisma.agent.findUnique({
        where: { id: req.agent.agentId },
        select: { permissions: true, isActive: true, role: true },
      });

      if (!agent || !agent.isActive) {
        return res.status(401).json({ error: "Agent account is inactive" });
      }

      // Check if agent has required permissions
      const hasPermission = requiredPermissions.every(permission => 
        agent.permissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: "Insufficient permissions", 
          required: requiredPermissions,
          current: agent.permissions 
        });
      }

      // Add agent data to request
      req.agentData = agent;
      next();
    } catch (error) {
      console.error("Error checking agent permissions:", error);
      res.status(500).json({ error: "Failed to verify permissions" });
    }
  };
}

// Property-specific access control for agents
export function requirePropertyAccess(req, res, next) {
  if (!req.agent) {
    return res.status(401).json({ error: "Agent authentication required" });
  }

  // Extract property ID from request (params, body, or query)
  const propertyId = req.params.propertyId || req.body.propertyId || req.query.propertyId;
  
  if (!propertyId) {
    return res.status(400).json({ error: "Property ID is required" });
  }

  // Check if agent has access to this property
  if (!req.agent.assignedProperties.includes(propertyId)) {
    return res.status(403).json({ 
      error: "Access denied to this property",
      propertyId 
    });
  }

  next();
}

// Middleware to check if agent can access specific lease
export function requireLeaseAccess(req, res, next) {
  if (!req.agent) {
    return res.status(401).json({ error: "Agent authentication required" });
  }

  const leaseId = req.params.leaseId || req.body.leaseId || req.query.leaseId;
  
  if (!leaseId) {
    return res.status(400).json({ error: "Lease ID is required" });
  }

  // Check if agent has access to this lease through AgentLease relationship
  prisma.agentLease.findFirst({
    where: {
      agentId: req.agent.agentId,
      leaseId: leaseId,
    },
  })
  .then(agentLease => {
    if (!agentLease) {
      return res.status(403).json({ 
        error: "Access denied to this lease",
        leaseId 
      });
    }
    next();
  })
  .catch(error => {
    console.error("Error checking lease access:", error);
    res.status(500).json({ error: "Failed to verify lease access" });
  });
}

// Admin or Agent Manager role check
export function requireAgentAdmin(req, res, next) {
  if (req.userType === "user" && req.user?.role === "ADMIN") {
    // Regular admin user
    return next();
  }
  
  if (req.userType === "agent" && req.agent?.role === "AGENT_MANAGER") {
    // Agent manager
    return next();
  }

  return res.status(403).json({ 
    error: "Admin or Agent Manager role required" 
  });
}

// Middleware to validate agent belongs to same agency
export function requireSameAgency(req, res, next) {
  const agencyId = req.user?.agencyId || req.agent?.agencyId;
  
  if (!agencyId) {
    return res.status(401).json({ error: "Agency information missing" });
  }

  // Add agency validation to request context
  req.agencyId = agencyId;
  next();
}

// Default permissions for different agent roles
export const AGENT_PERMISSIONS = {
  AGENT: [
    "view_assigned_properties",
    "view_assigned_leases", 
    "view_tenant_info",
    "record_payments",
    "send_messages",
    "view_own_commissions",
  ],
  SENIOR_AGENT: [
    "view_assigned_properties",
    "view_assigned_leases",
    "view_tenant_info", 
    "record_payments",
    "send_messages",
    "view_own_commissions",
    "manage_caretakers",
    "generate_reports",
    "view_property_analytics",
  ],
  AGENT_MANAGER: [
    "view_all_properties",
    "view_all_leases",
    "view_tenant_info",
    "record_payments", 
    "send_messages",
    "view_all_commissions",
    "manage_caretakers",
    "generate_reports",
    "view_property_analytics",
    "manage_agents",
    "assign_properties",
    "manage_agent_permissions",
  ],
};