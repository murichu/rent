import { Router } from "express";
import { prisma } from "../db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { requireAgentAuth } from "../middleware/agentAuth.js";
import { AGENT_PERMISSIONS } from "../middleware/agentAuth.js";

export const agentAuthRouter = Router();

// Validation schemas
const agentLoginSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const createAgentAccountSchema = z.object({
  agentId: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["AGENT", "SENIOR_AGENT", "AGENT_MANAGER"]).default("AGENT"),
  permissions: z.array(z.string()).optional(),
});

const updateAgentPermissionsSchema = z.object({
  permissions: z.array(z.string()),
  role: z.enum(["AGENT", "SENIOR_AGENT", "AGENT_MANAGER"]).optional(),
});

// POST /agent-auth/login - Agent login
agentAuthRouter.post("/login", async (req, res) => {
  try {
    const parsed = agentLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { phone, password } = parsed.data;

    // Find agent by phone
    const agent = await prisma.agent.findFirst({
      where: { 
        phone,
        isActive: true,
        passwordHash: { not: null }, // Must have password set
      },
      include: {
        agency: { select: { id: true, name: true } },
        settings: true,
      },
    });

    if (!agent) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, agent.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        agentId: agent.id,
        agencyId: agent.agencyId,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        role: agent.role,
        permissions: agent.permissions,
        assignedProperties: agent.assignedProperties,
        userType: "agent", // Distinguish from regular users
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        email: agent.email,
        role: agent.role,
        permissions: agent.permissions,
        agencyId: agent.agencyId,
        agency: agent.agency,
      },
    });
  } catch (error) {
    console.error("Agent login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /agent-auth/create-account - Create agent account (Admin only)
agentAuthRouter.post("/create-account", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = createAgentAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { agentId, password, role, permissions } = parsed.data;

    // Check if agent exists and belongs to agency
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        agencyId: req.user.agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    if (agent.passwordHash) {
      return res.status(400).json({ error: "Agent account already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Set default permissions based on role
    const defaultPermissions = permissions || AGENT_PERMISSIONS[role] || AGENT_PERMISSIONS.AGENT;

    // Update agent with authentication details
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        passwordHash,
        role,
        permissions: defaultPermissions,
        isActive: true,
      },
      include: {
        agency: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({
      message: "Agent account created successfully",
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        phone: updatedAgent.phone,
        email: updatedAgent.email,
        role: updatedAgent.role,
        permissions: updatedAgent.permissions,
        isActive: updatedAgent.isActive,
      },
    });
  } catch (error) {
    console.error("Error creating agent account:", error);
    res.status(500).json({ error: "Failed to create agent account" });
  }
});

// PUT /agent-auth/:agentId/permissions - Update agent permissions (Admin only)
agentAuthRouter.put("/:agentId/permissions", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = updateAgentPermissionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: parsed.error.flatten() 
      });
    }

    const { permissions, role } = parsed.data;

    // Check if agent exists and belongs to agency
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.agentId,
        agencyId: req.user.agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Update agent permissions and role
    const updatedAgent = await prisma.agent.update({
      where: { id: req.params.agentId },
      data: {
        permissions,
        ...(role && { role }),
      },
    });

    res.json({
      message: "Agent permissions updated successfully",
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        role: updatedAgent.role,
        permissions: updatedAgent.permissions,
      },
    });
  } catch (error) {
    console.error("Error updating agent permissions:", error);
    res.status(500).json({ error: "Failed to update agent permissions" });
  }
});

// PUT /agent-auth/:agentId/toggle-status - Activate/deactivate agent (Admin only)
agentAuthRouter.put("/:agentId/toggle-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    // Check if agent exists and belongs to agency
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.agentId,
        agencyId: req.user.agencyId,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Toggle agent status
    const updatedAgent = await prisma.agent.update({
      where: { id: req.params.agentId },
      data: { isActive: !agent.isActive },
    });

    res.json({
      message: `Agent ${updatedAgent.isActive ? 'activated' : 'deactivated'} successfully`,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        isActive: updatedAgent.isActive,
      },
    });
  } catch (error) {
    console.error("Error toggling agent status:", error);
    res.status(500).json({ error: "Failed to toggle agent status" });
  }
});

// GET /agent-auth/profile - Get current agent profile
agentAuthRouter.get("/profile", requireAgentAuth, async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent.agentId },
      include: {
        agency: { select: { id: true, name: true } },
        settings: true,
        leases: {
          include: {
            lease: {
              include: {
                property: { select: { title: true } },
                unit: { select: { unitNumber: true } },
                tenant: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json({
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      role: agent.role,
      permissions: agent.permissions,
      isActive: agent.isActive,
      commissionRate: agent.commissionRate,
      totalEarned: agent.totalEarned,
      rating: agent.rating,
      assignedProperties: agent.assignedProperties,
      agency: agent.agency,
      settings: agent.settings,
      activeLeases: agent.leases.length,
      lastLoginAt: agent.lastLoginAt,
      createdAt: agent.createdAt,
    });
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    res.status(500).json({ error: "Failed to fetch agent profile" });
  }
});

// PUT /agent-auth/change-password - Change agent password
agentAuthRouter.put("/change-password", requireAgentAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    // Get current agent
    const agent = await prisma.agent.findUnique({
      where: { id: req.agent.agentId },
    });

    if (!agent || !agent.passwordHash) {
      return res.status(404).json({ error: "Agent not found or no password set" });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, agent.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.agent.update({
      where: { id: req.agent.agentId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing agent password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

// GET /agent-auth/permissions - Get available permissions
agentAuthRouter.get("/permissions", requireAuth, requireAdmin, (req, res) => {
  res.json({
    roles: Object.keys(AGENT_PERMISSIONS),
    permissions: AGENT_PERMISSIONS,
    availablePermissions: [
      "view_assigned_properties",
      "view_all_properties", 
      "view_assigned_leases",
      "view_all_leases",
      "view_tenant_info",
      "record_payments",
      "send_messages",
      "view_own_commissions",
      "view_all_commissions",
      "manage_caretakers",
      "generate_reports",
      "view_property_analytics",
      "manage_agents",
      "assign_properties",
      "manage_agent_permissions",
    ],
  });
});