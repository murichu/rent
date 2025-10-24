import { prisma } from "../db.js";

/**
 * Commission Calculation Service
 * Handles commission calculations for agents and caretakers
 */

// Calculate caretaker commission based on rent collected
export async function calculateCaretakerCommission(caretakerId, paymentPeriod, properties = []) {
    try {
        // Get caretaker details
        const caretaker = await prisma.caretaker.findUnique({
            where: { id: caretakerId },
            include: {
                properties: {
                    include: {
                        property: {
                            include: {
                                leases: {
                                    where: { endDate: null }, // Active leases only
                                    include: {
                                        payments: {
                                            where: {
                                                paidAt: {
                                                    gte: getPaymentPeriodStart(paymentPeriod),
                                                    lte: getPaymentPeriodEnd(paymentPeriod),
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!caretaker) {
            throw new Error("Caretaker not found");
        }

        // Filter properties if specific ones are provided
        let relevantProperties = caretaker.properties;
        if (properties.length > 0) {
            relevantProperties = caretaker.properties.filter(p =>
                properties.includes(p.propertyId)
            );
        }

        // Calculate total rent collected from caretaker's properties
        let totalRentCollected = 0;
        const propertyDetails = [];

        for (const propertyCaretaker of relevantProperties) {
            const property = propertyCaretaker.property;
            let propertyRentCollected = 0;

            // Sum up payments for this property in the period
            for (const lease of property.leases) {
                const leasePayments = lease.payments.reduce((sum, payment) => sum + payment.amount, 0);
                propertyRentCollected += leasePayments;
            }

            totalRentCollected += propertyRentCollected;
            propertyDetails.push({
                propertyId: property.id,
                propertyTitle: property.title,
                rentCollected: propertyRentCollected,
                activeLeases: property.leases.length,
            });
        }

        // Calculate commission based on caretaker's settings
        let commissionAmount = 0;
        if (caretaker.commissionType === "PERCENTAGE") {
            commissionAmount = Math.round((totalRentCollected * caretaker.commissionRate) / 100);
        } else if (caretaker.commissionType === "FLAT_RATE") {
            commissionAmount = Math.round(caretaker.commissionRate * 100); // Convert to cents
        }

        return {
            caretakerId,
            caretakerName: caretaker.name,
            paymentPeriod,
            paymentType: caretaker.paymentType,
            salaryAmount: caretaker.salaryAmount || 0,
            totalRentCollected,
            commissionRate: caretaker.commissionRate,
            commissionType: caretaker.commissionType,
            commissionAmount,
            totalAmount: (caretaker.salaryAmount || 0) + commissionAmount,
            propertyDetails,
            calculatedAt: new Date(),
        };
    } catch (error) {
        console.error("Error calculating caretaker commission:", error);
        throw error;
    }
}

// Calculate agent commission based on rent collected
export async function calculateAgentCommission(agentId, paymentPeriod, properties = []) {
    try {
        // Get agent details
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                leases: {
                    include: {
                        lease: {
                            include: {
                                payments: {
                                    where: {
                                        paidAt: {
                                            gte: getPaymentPeriodStart(paymentPeriod),
                                            lte: getPaymentPeriodEnd(paymentPeriod),
                                        },
                                    },
                                },
                                property: {
                                    select: { id: true, title: true },
                                },
                                unit: {
                                    select: { id: true, unitNumber: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!agent) {
            throw new Error("Agent not found");
        }

        // Filter leases if specific properties are provided
        let relevantLeases = agent.leases;
        if (properties.length > 0) {
            relevantLeases = agent.leases.filter(al =>
                properties.includes(al.lease.property?.id)
            );
        }

        // Calculate total rent collected and commission
        let totalRentCollected = 0;
        let totalCommissionAmount = 0;
        const leaseDetails = [];

        for (const agentLease of relevantLeases) {
            const lease = agentLease.lease;
            const leasePayments = lease.payments.reduce((sum, payment) => sum + payment.amount, 0);

            // Calculate commission for this lease
            let leaseCommission = 0;
            if (agent.commissionRate > 0) {
                // Agent commission is typically a percentage of rent collected
                leaseCommission = Math.round((leasePayments * agent.commissionRate) / 100);
            }

            totalRentCollected += leasePayments;
            totalCommissionAmount += leaseCommission;

            leaseDetails.push({
                leaseId: lease.id,
                propertyTitle: lease.property?.title,
                unitNumber: lease.unit?.unitNumber,
                rentCollected: leasePayments,
                commissionAmount: leaseCommission,
            });
        }

        return {
            agentId,
            agentName: agent.name,
            paymentPeriod,
            totalRentCollected,
            commissionRate: agent.commissionRate,
            totalCommissionAmount,
            leaseDetails,
            calculatedAt: new Date(),
        };
    } catch (error) {
        console.error("Error calculating agent commission:", error);
        throw error;
    }
}

// Get commission summary for an agency
export async function getAgencyCommissionSummary(agencyId, paymentPeriod) {
    try {
        const [agentCommissions, caretakerCommissions] = await Promise.all([
            // Calculate agent commissions
            prisma.agent.findMany({
                where: { agencyId, isActive: true },
                select: { id: true, name: true, commissionRate: true },
            }).then(agents =>
                Promise.all(agents.map(agent =>
                    calculateAgentCommission(agent.id, paymentPeriod)
                ))
            ),

            // Calculate caretaker commissions
            prisma.caretaker.findMany({
                where: { agencyId },
                select: { id: true, name: true, paymentType: true, commissionRate: true },
            }).then(caretakers =>
                Promise.all(caretakers.map(caretaker =>
                    calculateCaretakerCommission(caretaker.id, paymentPeriod)
                ))
            ),
        ]);

        const totalAgentCommissions = agentCommissions.reduce((sum, ac) => sum + ac.totalCommissionAmount, 0);
        const totalCaretakerCommissions = caretakerCommissions.reduce((sum, cc) => sum + cc.commissionAmount, 0);
        const totalCaretakerSalaries = caretakerCommissions.reduce((sum, cc) => sum + cc.salaryAmount, 0);

        return {
            agencyId,
            paymentPeriod,
            summary: {
                totalAgentCommissions,
                totalCaretakerCommissions,
                totalCaretakerSalaries,
                totalPayouts: totalAgentCommissions + totalCaretakerCommissions + totalCaretakerSalaries,
                activeAgents: agentCommissions.length,
                activeCaretakers: caretakerCommissions.length,
            },
            agentCommissions,
            caretakerCommissions,
            calculatedAt: new Date(),
        };
    } catch (error) {
        console.error("Error calculating agency commission summary:", error);
        throw error;
    }
}

// Auto-calculate and create agent commission payment
export async function autoCalculateAgentCommissionPayment(agentId, paymentPeriod, properties = []) {
    try {
        // Calculate commission
        const calculation = await calculateAgentCommission(agentId, paymentPeriod, properties);

        // Check if payment already exists for this period
        const existingPayment = await prisma.agentCommissionPayment.findFirst({
            where: {
                agentId,
                paymentPeriod,
            },
        });

        if (existingPayment) {
            throw new Error(`Commission payment for period ${paymentPeriod} already exists`);
        }

        // Get agent's agency ID
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: { agencyId: true },
        });

        if (!agent) {
            throw new Error("Agent not found");
        }

        // Create the commission payment record
        const payment = await prisma.agentCommissionPayment.create({
            data: {
                agentId,
                agencyId: agent.agencyId,
                amount: calculation.totalCommissionAmount,
                paymentDate: new Date(),
                paymentPeriod,
                rentCollected: calculation.totalRentCollected,
                commissionRate: calculation.commissionRate,
                description: `Auto-calculated commission for ${paymentPeriod}`,
                status: "PENDING", // Requires manual approval/processing
                leaseIds: calculation.leaseDetails.map(ld => ld.leaseId),
                properties: properties,
            },
        });

        return {
            payment,
            calculation,
        };
    } catch (error) {
        console.error("Error auto-calculating agent commission payment:", error);
        throw error;
    }
}

// Auto-calculate and create caretaker payment
export async function autoCalculateCaretakerPayment(caretakerId, paymentPeriod, properties = []) {
    try {
        // Calculate commission
        const calculation = await calculateCaretakerCommission(caretakerId, paymentPeriod, properties);

        // Check if payment already exists for this period
        const existingPayment = await prisma.caretakerPayment.findFirst({
            where: {
                caretakerId,
                paymentPeriod,
            },
        });

        if (existingPayment) {
            throw new Error(`Payment for period ${paymentPeriod} already exists`);
        }

        // Get caretaker's agency ID
        const caretaker = await prisma.caretaker.findUnique({
            where: { id: caretakerId },
            select: { agencyId: true },
        });

        if (!caretaker) {
            throw new Error("Caretaker not found");
        }

        // Create the payment record
        const payment = await prisma.caretakerPayment.create({
            data: {
                caretakerId,
                agencyId: caretaker.agencyId,
                amount: calculation.totalAmount,
                paymentDate: new Date(),
                paymentPeriod,
                paymentType: calculation.paymentType,
                salaryAmount: calculation.salaryAmount,
                commissionAmount: calculation.commissionAmount,
                rentCollected: calculation.totalRentCollected,
                commissionRate: calculation.commissionRate,
                description: `Auto-calculated payment for ${paymentPeriod}`,
                status: "PENDING", // Requires manual approval/processing
                properties: properties,
            },
        });

        return {
            payment,
            calculation,
        };
    } catch (error) {
        console.error("Error auto-calculating caretaker payment:", error);
        throw error;
    }
}

// Helper functions for date handling
function getPaymentPeriodStart(paymentPeriod) {
    // Assuming format "YYYY-MM" like "2024-01"
    const [year, month] = paymentPeriod.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, 1);
}

function getPaymentPeriodEnd(paymentPeriod) {
    // Assuming format "YYYY-MM" like "2024-01"
    const [year, month] = paymentPeriod.split('-');
    return new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
}

// Bulk process commission payments for all agents in agency
export async function bulkProcessAgentCommissions(agencyId, paymentPeriod) {
    try {
        validatePaymentPeriod(paymentPeriod);

        // Get all active agents in the agency
        const agents = await prisma.agent.findMany({
            where: {
                agencyId,
                isActive: true,
            },
            select: { id: true, name: true, commissionRate: true },
        });

        const results = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalAmount: 0,
        };

        // Process each agent
        for (const agent of agents) {
            try {
                const result = await autoCalculateAgentCommissionPayment(agent.id, paymentPeriod);

                results.successful.push({
                    agentId: agent.id,
                    agentName: agent.name,
                    amount: result.calculation.totalCommissionAmount,
                    paymentId: result.payment.id,
                });

                results.totalAmount += result.calculation.totalCommissionAmount;
                results.totalProcessed++;
            } catch (error) {
                results.failed.push({
                    agentId: agent.id,
                    agentName: agent.name,
                    error: error.message,
                });
            }
        }

        return results;
    } catch (error) {
        console.error("Error bulk processing agent commissions:", error);
        throw error;
    }
}

// Bulk process commission payments for all caretakers in agency
export async function bulkProcessCaretakerCommissions(agencyId, paymentPeriod) {
    try {
        validatePaymentPeriod(paymentPeriod);

        // Get all caretakers in the agency
        const caretakers = await prisma.caretaker.findMany({
            where: { agencyId },
            select: { id: true, name: true, paymentType: true, commissionRate: true, salaryAmount: true },
        });

        const results = {
            successful: [],
            failed: [],
            totalProcessed: 0,
            totalAmount: 0,
        };

        // Process each caretaker
        for (const caretaker of caretakers) {
            try {
                const result = await autoCalculateCaretakerPayment(caretaker.id, paymentPeriod);

                results.successful.push({
                    caretakerId: caretaker.id,
                    caretakerName: caretaker.name,
                    amount: result.calculation.totalAmount,
                    paymentId: result.payment.id,
                });

                results.totalAmount += result.calculation.totalAmount;
                results.totalProcessed++;
            } catch (error) {
                results.failed.push({
                    caretakerId: caretaker.id,
                    caretakerName: caretaker.name,
                    error: error.message,
                });
            }
        }

        return results;
    } catch (error) {
        console.error("Error bulk processing caretaker commissions:", error);
        throw error;
    }
}

// Get comprehensive payment summary for agency
export async function getAgencyPaymentSummary(agencyId, paymentPeriod) {
    try {
        validatePaymentPeriod(paymentPeriod);

        const [agentPayments, caretakerPayments] = await Promise.all([
            // Agent commission payments
            prisma.agentCommissionPayment.findMany({
                where: {
                    agencyId,
                    paymentPeriod,
                },
                include: {
                    agent: {
                        select: { name: true },
                    },
                },
            }),

            // Caretaker payments
            prisma.caretakerPayment.findMany({
                where: {
                    agencyId,
                    paymentPeriod,
                },
                include: {
                    caretaker: {
                        select: { name: true },
                    },
                },
            }),
        ]);

        const totalAgentCommissions = agentPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalCaretakerPayments = caretakerPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalCaretakerSalaries = caretakerPayments.reduce((sum, payment) => sum + (payment.salaryAmount || 0), 0);
        const totalCaretakerCommissions = caretakerPayments.reduce((sum, payment) => sum + (payment.commissionAmount || 0), 0);

        return {
            agencyId,
            paymentPeriod,
            summary: {
                totalAgentCommissions,
                totalCaretakerPayments,
                totalCaretakerSalaries,
                totalCaretakerCommissions,
                totalPayouts: totalAgentCommissions + totalCaretakerPayments,
                agentPaymentCount: agentPayments.length,
                caretakerPaymentCount: caretakerPayments.length,
            },
            agentPayments: agentPayments.map(payment => ({
                id: payment.id,
                agentName: payment.agent.name,
                amount: payment.amount,
                status: payment.status,
                paymentDate: payment.paymentDate,
            })),
            caretakerPayments: caretakerPayments.map(payment => ({
                id: payment.id,
                caretakerName: payment.caretaker.name,
                amount: payment.amount,
                paymentType: payment.paymentType,
                salaryAmount: payment.salaryAmount,
                commissionAmount: payment.commissionAmount,
                status: payment.status,
                paymentDate: payment.paymentDate,
            })),
            calculatedAt: new Date(),
        };
    } catch (error) {
        console.error("Error getting agency payment summary:", error);
        throw error;
    }
}

// Validate payment period format
export function validatePaymentPeriod(paymentPeriod) {
    const periodRegex = /^\d{4}-\d{2}$/;
    if (!periodRegex.test(paymentPeriod)) {
        throw new Error("Payment period must be in format YYYY-MM (e.g., 2024-01)");
    }

    const [year, month] = paymentPeriod.split('-');
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (yearNum < 2020 || yearNum > 2030) {
        throw new Error("Year must be between 2020 and 2030");
    }

    if (monthNum < 1 || monthNum > 12) {
        throw new Error("Month must be between 01 and 12");
    }

    return true;
}