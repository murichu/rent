import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireAgentAuth, requireSameAgency } from "../middleware/agentAuth.js";
import {
    sendMessage,
    sendBulkMessage,
    processMessageDelivery,
    processMessageTemplate,
    getMessageHistory,
    getMessageAnalytics,
} from "../services/messagingService.js";

export const messagingRouter = Router();

// Validation schemas
const sendMessageSchema = z.object({
    recipientIds: z.array(z.string()).min(1, "At least one recipient is required"),
    recipientType: z.enum(["TENANT", "AGENT", "USER"]),
    subject: z.string().optional(),
    content: z.string().min(1, "Message content is required"),
    messageType: z.enum(["GENERAL", "RENT_REMINDER", "MAINTENANCE", "URGENT", "NOTICE"]).default("GENERAL"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    channels: z.array(z.enum(["email", "sms", "whatsapp"])).default(["email"]),
    scheduledAt: z.string().datetime().optional(),
    templateId: z.string().optional(),
    properties: z.array(z.string()).optional(),
    leases: z.array(z.string()).optional(),
});

const sendBulkMessageSchema = z.object({
    tenantIds: z.array(z.string()).optional(),
    subject: z.string().optional(),
    content: z.string().min(1, "Message content is required"),
    messageType: z.enum(["GENERAL", "RENT_REMINDER", "MAINTENANCE", "URGENT", "NOTICE"]).default("GENERAL"),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
    channels: z.array(z.enum(["email", "sms", "whatsapp"])).default(["email"]),
    scheduledAt: z.string().datetime().optional(),
    templateId: z.string().optional(),
    properties: z.array(z.string()).optional(),
    filterCriteria: z.object({
        propertyIds: z.array(z.string()).optional(),
        leaseStatus: z.string().optional(),
        paymentStatus: z.string().optional(),
    }).optional(),
});

const createTemplateSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    category: z.enum(["RENT_REMINDER", "PAYMENT_CONFIRMATION", "MAINTENANCE", "WELCOME", "NOTICE", "GENERAL"]),
    subject: z.string().optional(),
    content: z.string().min(1, "Template content is required"),
    channels: z.array(z.enum(["email", "sms", "whatsapp"])).default(["email"]),
    variables: z.array(z.string()).default([]),
    isDefault: z.boolean().default(false),
});

// POST /messages/send - Send message to specific recipients
messagingRouter.post("/send", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to send messages
        if (req.userType === "agent") {
            const agent = await prisma.agent.findUnique({
                where: { id: req.agent.agentId },
                select: { permissions: true, isActive: true },
            });

            if (!agent || !agent.isActive || !agent.permissions.includes("send_messages")) {
                return res.status(403).json({ error: "Insufficient permissions to send messages" });
            }
        }

        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const {
            recipientIds,
            recipientType,
            subject,
            content,
            messageType,
            priority,
            channels,
            scheduledAt,
            templateId,
            properties,
            leases,
        } = parsed.data;

        // Get sender information
        const senderId = req.user?.id || req.agent?.agentId;
        const senderType = req.userType?.toUpperCase() || "USER";
        const senderName = req.user?.name || req.agent?.name || "System";

        // Process template if provided
        let finalSubject = subject;
        let finalContent = content;

        if (templateId) {
            const template = await prisma.messageTemplate.findFirst({
                where: {
                    id: templateId,
                    agencyId: req.agencyId,
                    isActive: true,
                },
            });

            if (template) {
                // You can add variable processing here based on recipients
                const processed = processMessageTemplate(template, {
                    senderName,
                    agencyName: "Your Agency", // Get from agency record
                });
                finalSubject = processed.subject || subject;
                finalContent = processed.content;
            }
        }

        const result = await sendMessage({
            agencyId: req.agencyId,
            senderId,
            senderType,
            senderName,
            recipientIds,
            recipientType,
            subject: finalSubject,
            content: finalContent,
            messageType,
            priority,
            channels,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            templateId,
            properties: properties || [],
            leases: leases || [],
        });

        res.status(201).json({
            message: "Message sent successfully",
            result,
        });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ error: error.message || "Failed to send message" });
    }
});

// POST /messages/bulk - Send bulk message to multiple tenants
messagingRouter.post("/bulk", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to send messages
        if (req.userType === "agent") {
            const agent = await prisma.agent.findUnique({
                where: { id: req.agent.agentId },
                select: { permissions: true, isActive: true },
            });

            if (!agent || !agent.isActive || !agent.permissions.includes("send_messages")) {
                return res.status(403).json({ error: "Insufficient permissions to send messages" });
            }
        }

        const parsed = sendBulkMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const {
            tenantIds,
            subject,
            content,
            messageType,
            priority,
            channels,
            scheduledAt,
            templateId,
            properties,
            filterCriteria,
        } = parsed.data;

        // Get sender information
        const senderId = req.user?.id || req.agent?.agentId;
        const senderType = req.userType?.toUpperCase() || "USER";
        const senderName = req.user?.name || req.agent?.name || "System";

        const result = await sendBulkMessage({
            agencyId: req.agencyId,
            senderId,
            senderType,
            senderName,
            tenantIds,
            subject,
            content,
            messageType,
            priority,
            channels,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            templateId,
            properties: properties || [],
            filterCriteria: filterCriteria || {},
        });

        res.status(201).json({
            message: "Bulk message sent successfully",
            result,
        });
    } catch (error) {
        console.error("Error sending bulk message:", error);
        res.status(500).json({ error: error.message || "Failed to send bulk message" });
    }
});

// GET /messages - Get messages for agency
messagingRouter.get("/", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { page = 1, limit = 20, messageType, status, recipientType, startDate, endDate } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {
            agencyId: req.agencyId,
        };

        if (messageType) {
            where.messageType = messageType.toUpperCase();
        }

        if (status) {
            where.status = status.toUpperCase();
        }

        if (recipientType) {
            where.recipientType = recipientType.toUpperCase();
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [messages, total] = await Promise.all([
            prisma.message.findMany({
                where,
                include: {
                    template: {
                        select: { name: true, category: true },
                    },
                },
                skip,
                take: parseInt(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma.message.count({ where }),
        ]);

        res.json({
            messages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

// GET /messages/:id - Get specific message details
messagingRouter.get("/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const message = await prisma.message.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
            include: {
                template: true,
            },
        });

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        // Get recipient details
        const recipients = await prisma.messageRecipient.findMany({
            where: { messageId: req.params.id },
            orderBy: { createdAt: "asc" },
        });

        res.json({
            ...message,
            recipients,
        });
    } catch (error) {
        console.error("Error fetching message:", error);
        res.status(500).json({ error: "Failed to fetch message" });
    }
});

// POST /messages/:id/resend - Resend failed message
messagingRouter.post("/:id/resend", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Check if user has permission to send messages
        if (req.userType === "agent") {
            const agent = await prisma.agent.findUnique({
                where: { id: req.agent.agentId },
                select: { permissions: true, isActive: true },
            });

            if (!agent || !agent.isActive || !agent.permissions.includes("send_messages")) {
                return res.status(403).json({ error: "Insufficient permissions to resend messages" });
            }
        }

        const message = await prisma.message.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!message) {
            return res.status(404).json({ error: "Message not found" });
        }

        if (message.status === "SENT") {
            return res.status(400).json({ error: "Message was already sent successfully" });
        }

        // Reset message status and resend
        await prisma.message.update({
            where: { id: req.params.id },
            data: {
                status: "PENDING",
                sentAt: null,
            },
        });

        const result = await processMessageDelivery(req.params.id);

        res.json({
            message: "Message resent successfully",
            result,
        });
    } catch (error) {
        console.error("Error resending message:", error);
        res.status(500).json({ error: "Failed to resend message" });
    }
});

// GET /messages/history/:recipientType/:recipientId - Get message history for recipient
messagingRouter.get("/history/:recipientType/:recipientId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { recipientType, recipientId } = req.params;
        const { page = 1, limit = 20, messageType, startDate, endDate } = req.query;

        const result = await getMessageHistory(recipientId, recipientType, req.agencyId, {
            page: parseInt(page),
            limit: parseInt(limit),
            messageType,
            startDate,
            endDate,
        });

        res.json(result);
    } catch (error) {
        console.error("Error fetching message history:", error);
        res.status(500).json({ error: "Failed to fetch message history" });
    }
});

// GET /messages/analytics - Get messaging analytics
messagingRouter.get("/analytics", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { startDate, endDate, messageType, channel } = req.query;

        const analytics = await getMessageAnalytics(req.agencyId, {
            startDate,
            endDate,
            messageType,
            channel,
        });

        res.json(analytics);
    } catch (error) {
        console.error("Error fetching message analytics:", error);
        res.status(500).json({ error: "Failed to fetch message analytics" });
    }
});

// ===== COMMUNICATION PREFERENCES =====

// GET /preferences/:recipientType/:recipientId - Get communication preferences
messagingRouter.get("/preferences/:recipientType/:recipientId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { recipientType, recipientId } = req.params;

        const preference = await prisma.communicationPreference.findFirst({
            where: {
                agencyId: req.agencyId,
                recipientId,
                recipientType: recipientType.toUpperCase(),
            },
        });

        // If no preference exists, return defaults
        if (!preference) {
            return res.json({
                recipientId,
                recipientType: recipientType.toUpperCase(),
                preferredChannels: ["email"],
                emailEnabled: true,
                smsEnabled: true,
                whatsappEnabled: false,
                language: "en",
                timezone: "Africa/Nairobi",
                isActive: true,
            });
        }

        res.json(preference);
    } catch (error) {
        console.error("Error fetching communication preferences:", error);
        res.status(500).json({ error: "Failed to fetch communication preferences" });
    }
});

// PUT /preferences/:recipientType/:recipientId - Update communication preferences
messagingRouter.put("/preferences/:recipientType/:recipientId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { recipientType, recipientId } = req.params;
        const {
            preferredChannels,
            emailEnabled,
            smsEnabled,
            whatsappEnabled,
            emailAddress,
            phoneNumber,
            whatsappNumber,
            quietHours,
            messageTypes,
            language,
            timezone,
        } = req.body;

        // Validate recipient exists
        const recipientExists = await validateRecipientExists(recipientId, recipientType, req.agencyId);
        if (!recipientExists) {
            return res.status(404).json({ error: "Recipient not found" });
        }

        const preference = await prisma.communicationPreference.upsert({
            where: {
                agencyId_recipientId_recipientType: {
                    agencyId: req.agencyId,
                    recipientId,
                    recipientType: recipientType.toUpperCase(),
                },
            },
            update: {
                ...(preferredChannels && { preferredChannels }),
                ...(emailEnabled !== undefined && { emailEnabled }),
                ...(smsEnabled !== undefined && { smsEnabled }),
                ...(whatsappEnabled !== undefined && { whatsappEnabled }),
                ...(emailAddress !== undefined && { emailAddress }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(whatsappNumber !== undefined && { whatsappNumber }),
                ...(quietHours && { quietHours }),
                ...(messageTypes && { messageTypes }),
                ...(language && { language }),
                ...(timezone && { timezone }),
            },
            create: {
                agencyId: req.agencyId,
                recipientId,
                recipientType: recipientType.toUpperCase(),
                preferredChannels: preferredChannels || ["email"],
                emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
                smsEnabled: smsEnabled !== undefined ? smsEnabled : true,
                whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : false,
                emailAddress,
                phoneNumber,
                whatsappNumber,
                quietHours,
                messageTypes,
                language: language || "en",
                timezone: timezone || "Africa/Nairobi",
            },
        });

        res.json({
            message: "Communication preferences updated successfully",
            preference,
        });
    } catch (error) {
        console.error("Error updating communication preferences:", error);
        res.status(500).json({ error: "Failed to update communication preferences" });
    }
});

// GET /channel-config - Get agency channel configuration
messagingRouter.get("/channel-config", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const config = await prisma.channelConfiguration.findUnique({
            where: { agencyId: req.agencyId },
        });

        if (!config) {
            // Return default configuration
            return res.json({
                emailEnabled: true,
                smsEnabled: false,
                whatsappEnabled: false,
                defaultChannels: ["email"],
                maxRetries: 3,
                retryDelay: 300,
            });
        }

        res.json(config);
    } catch (error) {
        console.error("Error fetching channel configuration:", error);
        res.status(500).json({ error: "Failed to fetch channel configuration" });
    }
});

// PUT /channel-config - Update agency channel configuration
messagingRouter.put("/channel-config", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Only admins can update channel configuration
        if (req.userType === "agent") {
            return res.status(403).json({ error: "Only administrators can update channel configuration" });
        }

        const {
            emailEnabled,
            emailProvider,
            emailConfig,
            emailFromName,
            emailFromAddress,
            smsEnabled,
            smsProvider,
            smsConfig,
            smsFromNumber,
            whatsappEnabled,
            whatsappProvider,
            whatsappConfig,
            whatsappFromNumber,
            defaultChannels,
            maxRetries,
            retryDelay,
        } = req.body;

        const config = await prisma.channelConfiguration.upsert({
            where: { agencyId: req.agencyId },
            update: {
                ...(emailEnabled !== undefined && { emailEnabled }),
                ...(emailProvider && { emailProvider }),
                ...(emailConfig && { emailConfig }),
                ...(emailFromName !== undefined && { emailFromName }),
                ...(emailFromAddress !== undefined && { emailFromAddress }),
                ...(smsEnabled !== undefined && { smsEnabled }),
                ...(smsProvider && { smsProvider }),
                ...(smsConfig && { smsConfig }),
                ...(smsFromNumber !== undefined && { smsFromNumber }),
                ...(whatsappEnabled !== undefined && { whatsappEnabled }),
                ...(whatsappProvider && { whatsappProvider }),
                ...(whatsappConfig && { whatsappConfig }),
                ...(whatsappFromNumber !== undefined && { whatsappFromNumber }),
                ...(defaultChannels && { defaultChannels }),
                ...(maxRetries !== undefined && { maxRetries }),
                ...(retryDelay !== undefined && { retryDelay }),
            },
            create: {
                agencyId: req.agencyId,
                emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
                emailProvider,
                emailConfig,
                emailFromName,
                emailFromAddress,
                smsEnabled: smsEnabled !== undefined ? smsEnabled : false,
                smsProvider,
                smsConfig,
                smsFromNumber,
                whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : false,
                whatsappProvider,
                whatsappConfig,
                whatsappFromNumber,
                defaultChannels: defaultChannels || ["email"],
                maxRetries: maxRetries || 3,
                retryDelay: retryDelay || 300,
            },
        });

        res.json({
            message: "Channel configuration updated successfully",
            config,
        });
    } catch (error) {
        console.error("Error updating channel configuration:", error);
        res.status(500).json({ error: "Failed to update channel configuration" });
    }
});

// GET /available-channels/:recipientType/:recipientId - Get available channels for recipient
messagingRouter.get("/available-channels/:recipientType/:recipientId", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { recipientType, recipientId } = req.params;
        const { requestedChannels } = req.query;

        const channels = requestedChannels ? requestedChannels.split(",") : [];
        
        const { getAvailableChannels } = await import("../services/messagingService.js");
        const availableChannels = await getAvailableChannels(
            recipientId,
            recipientType,
            req.agencyId,
            channels
        );

        res.json({
            recipientId,
            recipientType,
            availableChannels,
            requestedChannels: channels,
        });
    } catch (error) {
        console.error("Error getting available channels:", error);
        res.status(500).json({ error: "Failed to get available channels" });
    }
});

// Helper function to validate recipient exists
async function validateRecipientExists(recipientId, recipientType, agencyId) {
    switch (recipientType.toLowerCase()) {
        case "tenant":
            const tenant = await prisma.tenant.findFirst({
                where: { id: recipientId, agencyId },
            });
            return !!tenant;
        
        case "agent":
            const agent = await prisma.agent.findFirst({
                where: { id: recipientId, agencyId },
            });
            return !!agent;
        
        case "user":
            const user = await prisma.user.findFirst({
                where: { id: recipientId, agencyId },
            });
            return !!user;
        
        default:
            return false;
    }
}

// POST /test-channel - Test channel connectivity
messagingRouter.post("/test-channel", requireAuth, requireSameAgency, async (req, res) => {
    try {
        // Only admins can test channels
        if (req.userType === "agent") {
            return res.status(403).json({ error: "Only administrators can test channel connectivity" });
        }

        const { channel, testData } = req.body;

        if (!channel) {
            return res.status(400).json({ error: "Channel is required" });
        }

        const { testChannelConnectivity } = await import("../services/messagingService.js");
        const result = await testChannelConnectivity(req.agencyId, channel, testData || {});

        res.json({
            message: `Channel test completed for ${channel}`,
            result,
        });
    } catch (error) {
        console.error("Error testing channel:", error);
        res.status(500).json({ error: "Failed to test channel connectivity" });
    }
});

// GET /channel-stats - Get channel usage statistics
messagingRouter.get("/channel-stats", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const { getChannelUsageStats } = await import("../services/messagingService.js");
        const stats = await getChannelUsageStats(req.agencyId, {
            startDate,
            endDate,
        });

        res.json({
            message: "Channel usage statistics retrieved successfully",
            stats,
        });
    } catch (error) {
        console.error("Error fetching channel statistics:", error);
        res.status(500).json({ error: "Failed to fetch channel statistics" });
    }
});

// ===== MESSAGE TEMPLATES =====

// GET /templates - Get message templates
messagingRouter.get("/templates", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const { category, isActive } = req.query;

        const where = {
            agencyId: req.agencyId,
        };

        if (category) {
            where.category = category.toUpperCase();
        }

        if (isActive !== undefined) {
            where.isActive = isActive === "true";
        }

        const templates = await prisma.messageTemplate.findMany({
            where,
            orderBy: [
                { isDefault: "desc" },
                { name: "asc" },
            ],
        });

        res.json({ templates });
    } catch (error) {
        console.error("Error fetching message templates:", error);
        res.status(500).json({ error: "Failed to fetch message templates" });
    }
});

// POST /templates - Create message template
messagingRouter.post("/templates", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const parsed = createTemplateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const { name, category, subject, content, channels, variables, isDefault } = parsed.data;

        // Check for duplicate template name
        const existingTemplate = await prisma.messageTemplate.findFirst({
            where: {
                agencyId: req.agencyId,
                name,
            },
        });

        if (existingTemplate) {
            return res.status(400).json({ error: "Template with this name already exists" });
        }

        // If setting as default, unset other defaults in same category
        if (isDefault) {
            await prisma.messageTemplate.updateMany({
                where: {
                    agencyId: req.agencyId,
                    category,
                    isDefault: true,
                },
                data: { isDefault: false },
            });
        }

        const template = await prisma.messageTemplate.create({
            data: {
                agencyId: req.agencyId,
                name,
                category,
                subject,
                content,
                channels,
                variables,
                isDefault,
                createdBy: req.user?.id || req.agent?.agentId,
            },
        });

        res.status(201).json({
            message: "Message template created successfully",
            template,
        });
    } catch (error) {
        console.error("Error creating message template:", error);
        res.status(500).json({ error: "Failed to create message template" });
    }
});

// PUT /templates/:id - Update message template
messagingRouter.put("/templates/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const parsed = createTemplateSchema.partial().safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten(),
            });
        }

        const existingTemplate = await prisma.messageTemplate.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!existingTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }

        const { name, category, subject, content, channels, variables, isDefault } = parsed.data;

        // Check for duplicate name if name is being updated
        if (name && name !== existingTemplate.name) {
            const duplicateTemplate = await prisma.messageTemplate.findFirst({
                where: {
                    agencyId: req.agencyId,
                    name,
                    id: { not: req.params.id },
                },
            });

            if (duplicateTemplate) {
                return res.status(400).json({ error: "Template with this name already exists" });
            }
        }

        // If setting as default, unset other defaults in same category
        if (isDefault && (category || existingTemplate.category)) {
            await prisma.messageTemplate.updateMany({
                where: {
                    agencyId: req.agencyId,
                    category: category || existingTemplate.category,
                    isDefault: true,
                    id: { not: req.params.id },
                },
                data: { isDefault: false },
            });
        }

        const updatedTemplate = await prisma.messageTemplate.update({
            where: { id: req.params.id },
            data: parsed.data,
        });

        res.json({
            message: "Message template updated successfully",
            template: updatedTemplate,
        });
    } catch (error) {
        console.error("Error updating message template:", error);
        res.status(500).json({ error: "Failed to update message template" });
    }
});

// DELETE /templates/:id - Delete message template
messagingRouter.delete("/templates/:id", requireAuth, requireSameAgency, async (req, res) => {
    try {
        const existingTemplate = await prisma.messageTemplate.findFirst({
            where: {
                id: req.params.id,
                agencyId: req.agencyId,
            },
        });

        if (!existingTemplate) {
            return res.status(404).json({ error: "Template not found" });
        }

        await prisma.messageTemplate.delete({
            where: { id: req.params.id },
        });

        res.json({ message: "Message template deleted successfully" });
    } catch (error) {
        console.error("Error deleting message template:", error);
        res.status(500).json({ error: "Failed to delete message template" });
    }
});