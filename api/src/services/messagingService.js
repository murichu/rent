import { prisma } from "../db.js";

/**
 * Messaging Service
 * Handles multi-channel messaging (Email, SMS, WhatsApp) for agents and tenants
 */

// Send message to single or multiple recipients
export async function sendMessage({
    agencyId,
    senderId,
    senderType,
    senderName,
    recipientIds,
    recipientType,
    subject,
    content,
    messageType = "GENERAL",
    priority = "NORMAL",
    channels = ["email"],
    scheduledAt = null,
    templateId = null,
    properties = [],
    leases = [],
    metadata = {}
}) {
    try {
        // Validate recipients exist
        const recipients = await validateRecipients(recipientIds, recipientType, agencyId);
        
        if (recipients.length === 0) {
            throw new Error("No valid recipients found");
        }

        // Get communication preferences for all recipients
        const preferences = await getCommunicationPreferences(recipientIds, recipientType, agencyId);
        
        // Determine final channels for each recipient
        const recipientChannels = {};
        for (const recipient of recipients) {
            const availableChannels = await getAvailableChannels(
                recipient.id, 
                recipientType, 
                agencyId, 
                channels
            );
            recipientChannels[recipient.id] = availableChannels;
        }

        // Create message record
        const message = await prisma.message.create({
            data: {
                agencyId,
                senderId,
                senderType,
                senderName,
                recipientType,
                recipientIds,
                subject,
                content,
                messageType,
                priority,
                channels,
                status: scheduledAt ? "PENDING" : "PENDING",
                scheduledAt,
                templateId,
                properties,
                leases,
                metadata,
            },
        });

        // Create recipient records with personalized channels
        const recipientData = recipients.map(recipient => {
            const recipientPref = preferences[recipient.id];
            const finalChannels = recipientChannels[recipient.id] || channels;
            
            return {
                messageId: message.id,
                recipientId: recipient.id,
                recipientType,
                recipientName: recipient.name,
                recipientPhone: recipientPref?.phoneNumber || recipient.phone,
                recipientEmail: recipientPref?.emailAddress || recipient.email,
                channels: finalChannels,
                deliveryStatus: {},
            };
        });

        await prisma.messageRecipient.createMany({
            data: recipientData,
        });

        // If not scheduled, send immediately
        if (!scheduledAt) {
            await processMessageDelivery(message.id);
        }

        return {
            messageId: message.id,
            recipientCount: recipients.length,
            status: message.status,
            scheduledAt: message.scheduledAt,
        };
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
}

// Process message delivery across channels
export async function processMessageDelivery(messageId) {
    try {
        const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
                template: true,
            },
        });

        if (!message) {
            throw new Error("Message not found");
        }

        const recipients = await prisma.messageRecipient.findMany({
            where: { messageId },
        });

        let successCount = 0;
        let failureCount = 0;
        const deliveryResults = {};

        // Process each recipient
        for (const recipient of recipients) {
            const recipientResults = {};

            // Process each channel for this specific recipient
            for (const channel of recipient.channels) {
                try {
                    const result = await deliverToChannel(
                        channel,
                        recipient,
                        message.subject,
                        message.content,
                        message.priority
                    );

                    recipientResults[channel] = {
                        success: result.success,
                        messageId: result.messageId,
                        sentAt: new Date(),
                        error: result.error,
                    };

                    if (result.success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } catch (error) {
                    recipientResults[channel] = {
                        success: false,
                        error: error.message,
                        sentAt: new Date(),
                    };
                    failureCount++;
                }
            }

            // Update recipient delivery status
            await prisma.messageRecipient.update({
                where: { id: recipient.id },
                data: {
                    deliveryStatus: recipientResults,
                    sentAt: new Date(),
                },
            });

            deliveryResults[recipient.recipientId] = recipientResults;
        }

        // Update message status
        let messageStatus = "SENT";
        if (failureCount > 0 && successCount > 0) {
            messageStatus = "PARTIAL";
        } else if (failureCount > 0) {
            messageStatus = "FAILED";
        }

        await prisma.message.update({
            where: { id: messageId },
            data: {
                status: messageStatus,
                sentAt: new Date(),
                deliveryStatus: deliveryResults,
            },
        });

        return {
            messageId,
            status: messageStatus,
            successCount,
            failureCount,
            deliveryResults,
        };
    } catch (error) {
        console.error("Error processing message delivery:", error);
        
        // Update message as failed
        await prisma.message.update({
            where: { id: messageId },
            data: {
                status: "FAILED",
                deliveryStatus: { error: error.message },
            },
        });

        throw error;
    }
}

// Deliver message to specific channel
async function deliverToChannel(channel, recipient, subject, content, priority) {
    switch (channel.toLowerCase()) {
        case "email":
            return await sendEmail(recipient.recipientEmail, subject, content, priority);
        case "sms":
            return await sendSMS(recipient.recipientPhone, content, priority);
        case "whatsapp":
            return await sendWhatsApp(recipient.recipientPhone, content, priority);
        default:
            throw new Error(`Unsupported channel: ${channel}`);
    }
}

// Email delivery (placeholder - integrate with actual email service)
async function sendEmail(email, subject, content, priority) {
    try {
        // This would integrate with actual email service (SendGrid, AWS SES, etc.)
        console.log(`Sending email to ${email}: ${subject}`);
        
        // Simulate email sending
        const success = Math.random() > 0.1; // 90% success rate for simulation
        
        return {
            success,
            messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            error: success ? null : "Email delivery failed",
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

// SMS delivery (placeholder - integrate with actual SMS service)
async function sendSMS(phone, content, priority) {
    try {
        // This would integrate with SMS service (Twilio, Africa's Talking, etc.)
        console.log(`Sending SMS to ${phone}: ${content.substring(0, 50)}...`);
        
        // Simulate SMS sending
        const success = Math.random() > 0.05; // 95% success rate for simulation
        
        return {
            success,
            messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            error: success ? null : "SMS delivery failed",
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

// WhatsApp delivery (placeholder - integrate with WhatsApp Business API)
async function sendWhatsApp(phone, content, priority) {
    try {
        // This would integrate with WhatsApp Business API
        console.log(`Sending WhatsApp to ${phone}: ${content.substring(0, 50)}...`);
        
        // Simulate WhatsApp sending
        const success = Math.random() > 0.08; // 92% success rate for simulation
        
        return {
            success,
            messageId: `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            error: success ? null : "WhatsApp delivery failed",
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
        };
    }
}

// Get communication preferences for recipients
export async function getCommunicationPreferences(recipientIds, recipientType, agencyId) {
    try {
        const preferences = await prisma.communicationPreference.findMany({
            where: {
                agencyId,
                recipientId: { in: recipientIds },
                recipientType: recipientType.toUpperCase(),
                isActive: true,
            },
        });

        // Create a map for quick lookup
        const preferencesMap = {};
        preferences.forEach(pref => {
            preferencesMap[pref.recipientId] = pref;
        });

        return preferencesMap;
    } catch (error) {
        console.error("Error getting communication preferences:", error);
        return {};
    }
}

// Get agency channel configuration
export async function getChannelConfiguration(agencyId) {
    try {
        const config = await prisma.channelConfiguration.findUnique({
            where: { agencyId },
        });

        return config || {
            emailEnabled: true,
            smsEnabled: false,
            whatsappEnabled: false,
            defaultChannels: ["email"],
            maxRetries: 3,
            retryDelay: 300,
        };
    } catch (error) {
        console.error("Error getting channel configuration:", error);
        return {
            emailEnabled: true,
            smsEnabled: false,
            whatsappEnabled: false,
            defaultChannels: ["email"],
            maxRetries: 3,
            retryDelay: 300,
        };
    }
}

// Determine available channels for recipient
export async function getAvailableChannels(recipientId, recipientType, agencyId, requestedChannels = []) {
    try {
        // Get agency channel configuration
        const agencyConfig = await getChannelConfiguration(agencyId);
        
        // Get recipient preferences
        const preferences = await getCommunicationPreferences([recipientId], recipientType, agencyId);
        const recipientPref = preferences[recipientId];

        // Start with agency-enabled channels
        const availableChannels = [];
        
        if (agencyConfig.emailEnabled) {
            availableChannels.push("email");
        }
        
        if (agencyConfig.smsEnabled) {
            availableChannels.push("sms");
        }
        
        if (agencyConfig.whatsappEnabled) {
            availableChannels.push("whatsapp");
        }

        // Filter by recipient preferences if they exist
        let finalChannels = availableChannels;
        
        if (recipientPref) {
            finalChannels = availableChannels.filter(channel => {
                switch (channel) {
                    case "email":
                        return recipientPref.emailEnabled;
                    case "sms":
                        return recipientPref.smsEnabled;
                    case "whatsapp":
                        return recipientPref.whatsappEnabled;
                    default:
                        return true;
                }
            });
        }

        // If specific channels were requested, filter to those
        if (requestedChannels.length > 0) {
            finalChannels = finalChannels.filter(channel => 
                requestedChannels.includes(channel)
            );
        }

        // Fallback to preferred channels if available
        if (finalChannels.length === 0 && recipientPref?.preferredChannels) {
            finalChannels = recipientPref.preferredChannels.filter(channel => 
                availableChannels.includes(channel)
            );
        }

        // Final fallback to agency default
        if (finalChannels.length === 0) {
            finalChannels = agencyConfig.defaultChannels.filter(channel => 
                availableChannels.includes(channel)
            );
        }

        return finalChannels;
    } catch (error) {
        console.error("Error determining available channels:", error);
        return ["email"]; // Safe fallback
    }
}

// Validate recipients exist and belong to agency
async function validateRecipients(recipientIds, recipientType, agencyId) {
    switch (recipientType.toLowerCase()) {
        case "tenant":
            return await prisma.tenant.findMany({
                where: {
                    id: { in: recipientIds },
                    agencyId,
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                },
            });
        
        case "agent":
            return await prisma.agent.findMany({
                where: {
                    id: { in: recipientIds },
                    agencyId,
                    isActive: true,
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                },
            });
        
        case "user":
            return await prisma.user.findMany({
                where: {
                    id: { in: recipientIds },
                    agencyId,
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            });
        
        default:
            throw new Error(`Unsupported recipient type: ${recipientType}`);
    }
}

// Send bulk message to multiple tenants
export async function sendBulkMessage({
    agencyId,
    senderId,
    senderType,
    senderName,
    tenantIds,
    subject,
    content,
    messageType = "GENERAL",
    priority = "NORMAL",
    channels = ["email"],
    scheduledAt = null,
    templateId = null,
    properties = [],
    filterCriteria = {}
}) {
    try {
        // If no specific tenant IDs provided, use filter criteria
        let finalTenantIds = tenantIds;
        
        if (!tenantIds || tenantIds.length === 0) {
            const tenants = await getTenantsForBulkMessage(agencyId, filterCriteria);
            finalTenantIds = tenants.map(t => t.id);
        }

        if (finalTenantIds.length === 0) {
            throw new Error("No tenants found matching criteria");
        }

        return await sendMessage({
            agencyId,
            senderId,
            senderType,
            senderName,
            recipientIds: finalTenantIds,
            recipientType: "TENANT",
            subject,
            content,
            messageType,
            priority,
            channels,
            scheduledAt,
            templateId,
            properties,
            metadata: { bulkMessage: true, filterCriteria },
        });
    } catch (error) {
        console.error("Error sending bulk message:", error);
        throw error;
    }
}

// Get tenants for bulk messaging based on filter criteria
async function getTenantsForBulkMessage(agencyId, filterCriteria) {
    const where = {
        agencyId,
        // Add filters based on criteria
    };

    // Filter by properties
    if (filterCriteria.propertyIds && filterCriteria.propertyIds.length > 0) {
        where.leases = {
            some: {
                OR: [
                    { propertyId: { in: filterCriteria.propertyIds } },
                    { 
                        unit: {
                            propertyId: { in: filterCriteria.propertyIds }
                        }
                    }
                ],
                endDate: null, // Active leases only
            },
        };
    }

    // Filter by lease status, payment status, etc. can be added here

    return await prisma.tenant.findMany({
        where,
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
        },
    });
}

// Process template variables
export function processMessageTemplate(template, variables) {
    let processedSubject = template.subject || "";
    let processedContent = template.content;

    // Replace variables in subject and content
    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value || '');
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value || '');
    }

    return {
        subject: processedSubject,
        content: processedContent,
    };
}

// Get message history for a recipient
export async function getMessageHistory(recipientId, recipientType, agencyId, options = {}) {
    const { page = 1, limit = 20, messageType, startDate, endDate } = options;
    const skip = (page - 1) * limit;

    const where = {
        agencyId,
        recipientIds: { has: recipientId },
        recipientType: recipientType.toUpperCase(),
    };

    if (messageType) {
        where.messageType = messageType;
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
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.message.count({ where }),
    ]);

    return {
        messages,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
}

// Get message analytics
export async function getMessageAnalytics(agencyId, options = {}) {
    const { startDate, endDate, messageType, channel } = options;

    const where = {
        agencyId,
    };

    if (messageType) {
        where.messageType = messageType;
    }

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [
        totalMessages,
        messagesByStatus,
        messagesByType,
        messagesByChannel,
        recentMessages
    ] = await Promise.all([
        prisma.message.count({ where }),
        prisma.message.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
        }),
        prisma.message.groupBy({
            by: ['messageType'],
            where,
            _count: { _all: true },
        }),
        prisma.message.findMany({
            where,
            select: { channels: true },
        }).then(messages => {
            const channelCounts = {};
            messages.forEach(msg => {
                msg.channels.forEach(ch => {
                    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
                });
            });
            return Object.entries(channelCounts).map(([channel, count]) => ({
                channel,
                count,
            }));
        }),
        prisma.message.findMany({
            where,
            include: {
                template: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
        }),
    ]);

    return {
        summary: {
            totalMessages,
            messagesByStatus: messagesByStatus.map(item => ({
                status: item.status,
                count: item._count._all,
            })),
            messagesByType: messagesByType.map(item => ({
                type: item.messageType,
                count: item._count._all,
            })),
            messagesByChannel,
        },
        recentMessages,
    };
}

// Test channel connectivity
export async function testChannelConnectivity(agencyId, channel, testData = {}) {
    try {
        const config = await getChannelConfiguration(agencyId);
        
        switch (channel.toLowerCase()) {
            case "email":
                if (!config.emailEnabled) {
                    throw new Error("Email channel is not enabled for this agency");
                }
                return await testEmailChannel(config, testData);
            
            case "sms":
                if (!config.smsEnabled) {
                    throw new Error("SMS channel is not enabled for this agency");
                }
                return await testSMSChannel(config, testData);
            
            case "whatsapp":
                if (!config.whatsappEnabled) {
                    throw new Error("WhatsApp channel is not enabled for this agency");
                }
                return await testWhatsAppChannel(config, testData);
            
            default:
                throw new Error(`Unsupported channel: ${channel}`);
        }
    } catch (error) {
        console.error(`Error testing ${channel} channel:`, error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}

// Test email channel
async function testEmailChannel(config, testData) {
    try {
        const testEmail = testData.email || "test@example.com";
        const result = await sendEmail(
            testEmail,
            "Test Email - Channel Connectivity",
            "This is a test message to verify email channel connectivity.",
            "NORMAL"
        );
        
        return {
            success: result.success,
            channel: "email",
            provider: config.emailProvider || "default",
            testRecipient: testEmail,
            messageId: result.messageId,
            error: result.error,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            success: false,
            channel: "email",
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}

// Test SMS channel
async function testSMSChannel(config, testData) {
    try {
        const testPhone = testData.phone || "+254700000000";
        const result = await sendSMS(
            testPhone,
            "Test SMS - Channel connectivity verification.",
            "NORMAL"
        );
        
        return {
            success: result.success,
            channel: "sms",
            provider: config.smsProvider || "default",
            testRecipient: testPhone,
            messageId: result.messageId,
            error: result.error,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            success: false,
            channel: "sms",
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}

// Test WhatsApp channel
async function testWhatsAppChannel(config, testData) {
    try {
        const testPhone = testData.phone || "+254700000000";
        const result = await sendWhatsApp(
            testPhone,
            "Test WhatsApp - Channel connectivity verification.",
            "NORMAL"
        );
        
        return {
            success: result.success,
            channel: "whatsapp",
            provider: config.whatsappProvider || "default",
            testRecipient: testPhone,
            messageId: result.messageId,
            error: result.error,
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            success: false,
            channel: "whatsapp",
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}

// Get channel usage statistics
export async function getChannelUsageStats(agencyId, options = {}) {
    try {
        const { startDate, endDate } = options;
        
        const where = {
            agencyId,
        };

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        // Get message recipients with channel usage
        const recipients = await prisma.messageRecipient.findMany({
            where: {
                message: where,
            },
            select: {
                channels: true,
                deliveryStatus: true,
                sentAt: true,
            },
        });

        const stats = {
            totalMessages: recipients.length,
            channelUsage: {},
            channelSuccessRates: {},
            totalByChannel: {},
        };

        // Process channel statistics
        recipients.forEach(recipient => {
            recipient.channels.forEach(channel => {
                // Count total usage
                stats.totalByChannel[channel] = (stats.totalByChannel[channel] || 0) + 1;
                
                // Count successful deliveries
                const deliveryStatus = recipient.deliveryStatus || {};
                const channelStatus = deliveryStatus[channel];
                
                if (!stats.channelUsage[channel]) {
                    stats.channelUsage[channel] = {
                        total: 0,
                        successful: 0,
                        failed: 0,
                    };
                }
                
                stats.channelUsage[channel].total++;
                
                if (channelStatus?.success) {
                    stats.channelUsage[channel].successful++;
                } else {
                    stats.channelUsage[channel].failed++;
                }
            });
        });

        // Calculate success rates
        Object.keys(stats.channelUsage).forEach(channel => {
            const usage = stats.channelUsage[channel];
            stats.channelSuccessRates[channel] = usage.total > 0 
                ? Math.round((usage.successful / usage.total) * 100) 
                : 0;
        });

        return stats;
    } catch (error) {
        console.error("Error getting channel usage stats:", error);
        throw error;
    }
}