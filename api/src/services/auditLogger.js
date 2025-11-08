import { prisma } from "../db.js";

/**
 * Audit Logger Service
 * Tracks all user actions in the system
 */

/**
 * Log an audit event
 * @param {Object} params - Audit log parameters
 * @param {string} params.agencyId - Agency ID
 * @param {string} params.userId - User ID who performed the action
 * @param {string} params.userName - User's name
 * @param {string} params.userEmail - User's email
 * @param {string} params.action - Action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.entityType - Type of entity affected
 * @param {string} params.entityId - ID of the affected entity
 * @param {string} params.entityName - Name/title of the affected entity
 * @param {string} params.description - Human-readable description
 * @param {Object} params.metadata - Additional data (old values, new values, etc.)
 * @param {string} params.ipAddress - IP address of the user
 * @param {string} params.userAgent - User agent string
 */
export async function logAudit({
  agencyId,
  userId,
  userName,
  userEmail,
  action,
  entityType,
  entityId = null,
  entityName = null,
  description,
  metadata = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    await prisma.auditLog.create({
      data: {
        agencyId,
        userId,
        userName,
        userEmail,
        action,
        entityType,
        entityId,
        entityName,
        description,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw errors for audit logging failures
    // Just log them so they don't break the main operation
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Create audit log from Express request
 * @param {Object} req - Express request object
 * @param {string} action - Action performed
 * @param {string} entityType - Type of entity
 * @param {string} entityId - Entity ID
 * @param {string} entityName - Entity name
 * @param {string} description - Description
 * @param {Object} metadata - Additional metadata
 */
export async function logAuditFromRequest(
  req,
  action,
  entityType,
  entityId,
  entityName,
  description,
  metadata = null
) {
  if (!req.user) {
    console.warn("Attempted to log audit without authenticated user");
    return;
  }

  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("user-agent");

  await logAudit({
    agencyId: req.user.agencyId,
    userId: req.user.id,
    userName: req.user.name,
    userEmail: req.user.email,
    action,
    entityType,
    entityId,
    entityName,
    description,
    metadata,
    ipAddress,
    userAgent,
  });
}

/**
 * Middleware to automatically log CRUD operations
 * Add this after your route handler
 */
export function auditMiddleware(entityType) {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function to capture response
    res.send = function (data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Determine action based on HTTP method
        let action;
        switch (req.method) {
          case "POST":
            action = "CREATE";
            break;
          case "PUT":
          case "PATCH":
            action = "UPDATE";
            break;
          case "DELETE":
            action = "DELETE";
            break;
          case "GET":
            action = "VIEW";
            break;
          default:
            action = "VIEW";
        }

        // Extract entity information
        const entityId = req.params.id || null;
        let entityName = null;
        let description = `${action} ${entityType}`;

        // Try to extract entity name from request body or response
        try {
          const parsedData = typeof data === "string" ? JSON.parse(data) : data;
          entityName =
            parsedData?.name ||
            parsedData?.title ||
            parsedData?.data?.name ||
            parsedData?.data?.title ||
            null;

          // Create more descriptive message
          if (entityName) {
            description = `${action} ${entityType}: ${entityName}`;
          } else if (entityId) {
            description = `${action} ${entityType} (ID: ${entityId})`;
          }
        } catch (e) {
          // Ignore parsing errors
        }

        // Log the audit asynchronously (don't wait)
        logAuditFromRequest(
          req,
          action,
          entityType,
          entityId,
          entityName,
          description,
          {
            method: req.method,
            path: req.path,
            query: req.query,
            statusCode: res.statusCode,
          }
        ).catch((err) => console.error("Audit logging failed:", err));
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Helper functions for common audit actions
 */

export async function logLogin(req, user) {
  await logAuditFromRequest(
    req,
    "LOGIN",
    "User",
    user.id,
    user.name,
    `User ${user.email} logged in`,
    { email: user.email }
  );
}

export async function logLogout(req) {
  await logAuditFromRequest(
    req,
    "LOGOUT",
    "User",
    req.user.id,
    req.user.name,
    `User ${req.user.email} logged out`,
    { email: req.user.email }
  );
}

export async function logCreate(req, entityType, entity) {
  const entityName = entity.name || entity.title || entity.unitNumber || null;
  await logAuditFromRequest(
    req,
    "CREATE",
    entityType,
    entity.id,
    entityName,
    `Created ${entityType}${entityName ? `: ${entityName}` : ""}`,
    { entity }
  );
}

export async function logUpdate(req, entityType, entityId, entityName, oldData, newData) {
  await logAuditFromRequest(
    req,
    "UPDATE",
    entityType,
    entityId,
    entityName,
    `Updated ${entityType}${entityName ? `: ${entityName}` : ""}`,
    { oldData, newData }
  );
}

export async function logDelete(req, entityType, entityId, entityName) {
  await logAuditFromRequest(
    req,
    "DELETE",
    entityType,
    entityId,
    entityName,
    `Deleted ${entityType}${entityName ? `: ${entityName}` : ""}`,
    { entityId, entityName }
  );
}

export async function logStatusChange(req, entityType, entityId, entityName, oldStatus, newStatus) {
  await logAuditFromRequest(
    req,
    "STATUS_CHANGE",
    entityType,
    entityId,
    entityName,
    `Changed ${entityType} status from ${oldStatus} to ${newStatus}`,
    { oldStatus, newStatus }
  );
}

export async function logPayment(req, paymentId, amount, method, invoiceId) {
  await logAuditFromRequest(
    req,
    "PAYMENT",
    "Payment",
    paymentId,
    `Payment of ${amount}`,
    `Recorded payment of ${amount} via ${method}`,
    { amount, method, invoiceId }
  );
}

export async function logExport(req, entityType, count, format = "CSV") {
  await logAuditFromRequest(
    req,
    "EXPORT",
    entityType,
    null,
    null,
    `Exported ${count} ${entityType} records as ${format}`,
    { count, format }
  );
}
