import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { requireSameAgency } from "../middleware/agentAuth.js";
import { exportToPDF, exportToExcel, exportToCSV } from "../services/exportService.js";

export const reportsRouter = Router();

// Validation schemas
const reportFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  propertyIds: z.array(z.string()).optional(),
  agentIds: z.array(z.string()).optional(),
  tenantIds: z.array(z.string()).optional(),
  paymentMethods: z.array(z.string()).optional(),
  status: z.string().optional(),
});

const exportSchema = z.object({
  format: z.enum(["pdf", "excel", "csv"]).default("pdf"),
  includeCharts: z.boolean().default(true),
  includeDetails: z.boolean().default(true),
});

// GET /reports/financial - Generate financial reports
reportsRouter.get("/financial", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { startDate, endDate, propertyIds, format = "json" } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    // Build property filter
    const propertyFilter = {
      agencyId,
      ...(propertyIds && { id: { in: propertyIds.split(',') } }),
    };

    // Get rent collection data
    const rentCollectionData = await prisma.payment.groupBy({
      by: ['method', 'paidAt'],
      where: {
        agencyId,
        paidAt: { gte: start, lte: end },
        ...(propertyIds && {
          lease: {
            OR: [
              { propertyId: { in: propertyIds.split(',') } },
              { unit: { propertyId: { in: propertyIds.split(',') } } }
            ]
          }
        }),
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Get expense data
    const expenseData = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        agencyId,
        expenseDate: { gte: start, lte: end },
        status: 'PAID',
        ...(propertyIds && { propertyId: { in: propertyIds.split(',') } }),
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Get commission data
    const commissionData = await prisma.agentCommissionPayment.groupBy({
      by: ['paymentPeriod'],
      where: {
        agencyId,
        paymentDate: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Get caretaker payment data
    const caretakerPaymentData = await prisma.caretakerPayment.groupBy({
      by: ['paymentPeriod'],
      where: {
        agencyId,
        paymentDate: { gte: start, lte: end },
        status: 'COMPLETED',
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Calculate totals
    const totalRentCollected = rentCollectionData.reduce((sum, item) => sum + (item._sum.amount || 0), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + (item._sum.amount || 0), 0);
    const totalCommissions = commissionData.reduce((sum, item) => sum + (item._sum.amount || 0), 0);
    const totalCaretakerPayments = caretakerPaymentData.reduce((sum, item) => sum + (item._sum.amount || 0), 0);

    const netIncome = totalRentCollected - totalExpenses - totalCommissions - totalCaretakerPayments;

    const report = {
      period: { start, end },
      summary: {
        totalRentCollected,
        totalExpenses,
        totalCommissions,
        totalCaretakerPayments,
        netIncome,
        profitMargin: totalRentCollected > 0 ? (netIncome / totalRentCollected) * 100 : 0,
      },
      rentCollection: {
        byMethod: rentCollectionData.reduce((acc, item) => {
          acc[item.method] = (acc[item.method] || 0) + (item._sum.amount || 0);
          return acc;
        }, {}),
        timeline: rentCollectionData.map(item => ({
          date: item.paidAt,
          amount: item._sum.amount,
          count: item._count._all,
        })),
      },
      expenses: {
        byCategory: expenseData.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + (item._sum.amount || 0);
          return acc;
        }, {}),
        total: totalExpenses,
      },
      commissions: {
        byPeriod: commissionData.reduce((acc, item) => {
          acc[item.paymentPeriod] = (acc[item.paymentPeriod] || 0) + (item._sum.amount || 0);
          return acc;
        }, {}),
        total: totalCommissions,
      },
      generatedAt: new Date(),
    };

    // Handle different export formats
    if (format === "pdf") {
      const pdfBuffer = await exportToPDF(report, 'financial-report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${start.toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportToExcel(report, 'financial-report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${start.toISOString().split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    } else if (format === "csv") {
      const csvData = await exportToCSV(report, 'financial-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="financial-report-${start.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating financial report:", error);
    res.status(500).json({ error: "Failed to generate financial report" });
  }
});

// GET /reports/occupancy - Generate occupancy and performance reports
reportsRouter.get("/occupancy", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { startDate, endDate, propertyIds, format = "json" } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Build property filter
    const propertyFilter = {
      agencyId,
      ...(propertyIds && { id: { in: propertyIds.split(',') } }),
    };

    // Get properties with their units and current occupancy
    const properties = await prisma.property.findMany({
      where: propertyFilter,
      include: {
        units: {
          include: {
            leases: {
              where: {
                OR: [
                  { endDate: null }, // Active leases
                  { endDate: { gte: new Date() } }, // Future end dates
                ],
              },
              include: {
                tenant: { select: { name: true, phone: true } },
              },
            },
          },
        },
        leases: {
          where: {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
          include: {
            tenant: { select: { name: true, phone: true } },
          },
        },
      },
    });

    // Get vacancy notices within the period
    const vacancyNotices = await prisma.vacateNotice.findMany({
      where: {
        agencyId,
        noticeDate: { gte: start, lte: end },
      },
      include: {
        tenant: { select: { name: true } },
        lease: {
          include: {
            property: { select: { title: true } },
            unit: { select: { unitNumber: true } },
          },
        },
      },
    });

    // Calculate occupancy metrics
    let totalUnits = 0;
    let occupiedUnits = 0;
    let totalRentPotential = 0;
    let actualRentCollected = 0;

    const propertyMetrics = [];

    for (const property of properties) {
      const units = property.units.length > 0 ? property.units : [property]; // Handle properties without units
      const propertyTotalUnits = units.length;
      const propertyOccupiedUnits = units.filter(unit => 
        unit.leases && unit.leases.length > 0
      ).length;

      // If property has no units, check direct leases
      const directOccupancy = property.leases && property.leases.length > 0 ? 1 : 0;
      const finalOccupiedUnits = property.units.length > 0 ? propertyOccupiedUnits : directOccupancy;
      const finalTotalUnits = property.units.length > 0 ? propertyTotalUnits : 1;

      totalUnits += finalTotalUnits;
      occupiedUnits += finalOccupiedUnits;

      // Calculate rent potential and actual collection
      const propertyRentPotential = property.rentAmount || 0;
      totalRentPotential += propertyRentPotential * finalTotalUnits;

      // Get actual rent collected for this property
      const rentCollected = await prisma.payment.aggregate({
        where: {
          agencyId,
          paidAt: { gte: start, lte: end },
          lease: {
            OR: [
              { propertyId: property.id },
              { unit: { propertyId: property.id } },
            ],
          },
        },
        _sum: { amount: true },
      });

      const propertyRentCollected = rentCollected._sum.amount || 0;
      actualRentCollected += propertyRentCollected;

      propertyMetrics.push({
        propertyId: property.id,
        propertyTitle: property.title,
        totalUnits: finalTotalUnits,
        occupiedUnits: finalOccupiedUnits,
        vacantUnits: finalTotalUnits - finalOccupiedUnits,
        occupancyRate: finalTotalUnits > 0 ? (finalOccupiedUnits / finalTotalUnits) * 100 : 0,
        rentPotential: propertyRentPotential * finalTotalUnits,
        rentCollected: propertyRentCollected,
        collectionRate: propertyRentPotential > 0 ? (propertyRentCollected / (propertyRentPotential * finalTotalUnits)) * 100 : 0,
      });
    }

    // Calculate tenant turnover
    const tenantTurnover = vacancyNotices.length;
    const averageTenancyDuration = await calculateAverageTenancyDuration(agencyId, start, end);

    const report = {
      period: { start, end },
      summary: {
        totalProperties: properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        totalRentPotential,
        actualRentCollected,
        collectionRate: totalRentPotential > 0 ? (actualRentCollected / totalRentPotential) * 100 : 0,
        tenantTurnover,
        averageTenancyDuration,
      },
      propertyMetrics,
      vacancyNotices: vacancyNotices.map(notice => ({
        id: notice.id,
        tenantName: notice.tenant.name,
        propertyTitle: notice.lease.property?.title,
        unitNumber: notice.lease.unit?.unitNumber,
        noticeDate: notice.noticeDate,
        plannedVacateDate: notice.plannedVacateAt,
        actualVacateDate: notice.actualVacateAt,
        status: notice.status,
      })),
      generatedAt: new Date(),
    };

    // Handle different export formats
    if (format === "pdf") {
      const pdfBuffer = await exportToPDF(report, 'occupancy-report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="occupancy-report-${start.toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportToExcel(report, 'occupancy-report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="occupancy-report-${start.toISOString().split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    } else if (format === "csv") {
      const csvData = await exportToCSV(report, 'occupancy-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="occupancy-report-${start.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating occupancy report:", error);
    res.status(500).json({ error: "Failed to generate occupancy report" });
  }
});

// GET /reports/agent-performance - Generate agent performance reports
reportsRouter.get("/agent-performance", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { startDate, endDate, agentIds, format = "json" } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Build agent filter
    const agentFilter = {
      agencyId,
      ...(agentIds && { id: { in: agentIds.split(',') } }),
    };

    // Get agents with their performance data
    const agents = await prisma.agent.findMany({
      where: agentFilter,
      include: {
        leases: {
          include: {
            lease: {
              include: {
                property: { select: { title: true } },
                unit: { select: { unitNumber: true } },
                tenant: { select: { name: true } },
                payments: {
                  where: {
                    paidAt: { gte: start, lte: end },
                  },
                },
              },
            },
          },
        },
        commissionPayments: {
          where: {
            paymentDate: { gte: start, lte: end },
            status: 'COMPLETED',
          },
        },
      },
    });

    const agentPerformance = [];

    for (const agent of agents) {
      // Calculate rent collected by this agent
      const rentCollected = agent.leases.reduce((total, agentLease) => {
        const leasePayments = agentLease.lease.payments.reduce((sum, payment) => sum + payment.amount, 0);
        return total + leasePayments;
      }, 0);

      // Calculate commissions earned
      const commissionsEarned = agent.commissionPayments.reduce((total, payment) => total + payment.amount, 0);

      // Calculate number of properties managed
      const propertiesManaged = new Set(agent.leases.map(al => al.lease.propertyId || al.lease.unit?.propertyId)).size;

      // Calculate number of tenants managed
      const tenantsManaged = agent.leases.length;

      // Calculate average rent per tenant
      const averageRentPerTenant = tenantsManaged > 0 ? rentCollected / tenantsManaged : 0;

      // Calculate commission rate performance
      const expectedCommissions = (rentCollected * agent.commissionRate) / 100;
      const commissionCollectionRate = expectedCommissions > 0 ? (commissionsEarned / expectedCommissions) * 100 : 0;

      agentPerformance.push({
        agentId: agent.id,
        agentName: agent.name,
        agentPhone: agent.phone,
        agentEmail: agent.email,
        commissionRate: agent.commissionRate,
        propertiesManaged,
        tenantsManaged,
        rentCollected,
        commissionsEarned,
        expectedCommissions,
        commissionCollectionRate,
        averageRentPerTenant,
        performance: {
          rentCollectionRank: 0, // Will be calculated after sorting
          commissionEarningsRank: 0,
          efficiencyScore: tenantsManaged > 0 ? (rentCollected / tenantsManaged) / 1000 : 0, // Simplified efficiency metric
        },
      });
    }

    // Rank agents by performance
    agentPerformance.sort((a, b) => b.rentCollected - a.rentCollected);
    agentPerformance.forEach((agent, index) => {
      agent.performance.rentCollectionRank = index + 1;
    });

    agentPerformance.sort((a, b) => b.commissionsEarned - a.commissionsEarned);
    agentPerformance.forEach((agent, index) => {
      agent.performance.commissionEarningsRank = index + 1;
    });

    // Calculate summary statistics
    const totalRentCollected = agentPerformance.reduce((sum, agent) => sum + agent.rentCollected, 0);
    const totalCommissionsEarned = agentPerformance.reduce((sum, agent) => sum + agent.commissionsEarned, 0);
    const totalPropertiesManaged = agentPerformance.reduce((sum, agent) => sum + agent.propertiesManaged, 0);
    const totalTenantsManaged = agentPerformance.reduce((sum, agent) => sum + agent.tenantsManaged, 0);

    const report = {
      period: { start, end },
      summary: {
        totalAgents: agentPerformance.length,
        totalRentCollected,
        totalCommissionsEarned,
        totalPropertiesManaged,
        totalTenantsManaged,
        averageRentPerAgent: agentPerformance.length > 0 ? totalRentCollected / agentPerformance.length : 0,
        averageCommissionPerAgent: agentPerformance.length > 0 ? totalCommissionsEarned / agentPerformance.length : 0,
        topPerformer: agentPerformance.length > 0 ? agentPerformance[0] : null,
      },
      agentPerformance,
      generatedAt: new Date(),
    };

    // Handle different export formats
    if (format === "pdf") {
      const pdfBuffer = await exportToPDF(report, 'agent-performance-report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="agent-performance-report-${start.toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportToExcel(report, 'agent-performance-report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="agent-performance-report-${start.toISOString().split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    } else if (format === "csv") {
      const csvData = await exportToCSV(report, 'agent-performance-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="agent-performance-report-${start.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating agent performance report:", error);
    res.status(500).json({ error: "Failed to generate agent performance report" });
  }
});

// GET /reports/maintenance - Generate maintenance reports
reportsRouter.get("/maintenance", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const { startDate, endDate, propertyIds, status, category, format = "json" } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Build maintenance request filter
    const maintenanceFilter = {
      agencyId,
      createdAt: { gte: start, lte: end },
      ...(propertyIds && {
        lease: {
          OR: [
            { propertyId: { in: propertyIds.split(',') } },
            { unit: { propertyId: { in: propertyIds.split(',') } } }
          ]
        }
      }),
      ...(status && { status }),
      ...(category && { category }),
    };

    // Get maintenance requests
    const maintenanceRequests = await prisma.maintenanceRequest.findMany({
      where: maintenanceFilter,
      include: {
        lease: {
          include: {
            property: { select: { title: true, address: true } },
            unit: { select: { unitNumber: true } },
            tenant: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate metrics
    const totalRequests = maintenanceRequests.length;
    const completedRequests = maintenanceRequests.filter(req => req.status === 'COMPLETED').length;
    const pendingRequests = maintenanceRequests.filter(req => 
      ['SUBMITTED', 'ACKNOWLEDGED', 'SCHEDULED', 'IN_PROGRESS'].includes(req.status)
    ).length;
    const cancelledRequests = maintenanceRequests.filter(req => req.status === 'CANCELLED').length;

    // Calculate average response time
    const completedWithDates = maintenanceRequests.filter(req => 
      req.status === 'COMPLETED' && req.completedDate
    );
    const averageResponseTime = completedWithDates.length > 0 
      ? completedWithDates.reduce((sum, req) => {
          const responseTime = new Date(req.completedDate) - new Date(req.createdAt);
          return sum + responseTime;
        }, 0) / completedWithDates.length
      : 0;

    // Group by category
    const byCategory = maintenanceRequests.reduce((acc, req) => {
      acc[req.category] = (acc[req.category] || 0) + 1;
      return acc;
    }, {});

    // Group by priority
    const byPriority = maintenanceRequests.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1;
      return acc;
    }, {});

    // Calculate total costs
    const totalEstimatedCost = maintenanceRequests.reduce((sum, req) => sum + (req.estimatedCost || 0), 0);
    const totalActualCost = maintenanceRequests.reduce((sum, req) => sum + (req.actualCost || 0), 0);

    const report = {
      period: { start, end },
      summary: {
        totalRequests,
        completedRequests,
        pendingRequests,
        cancelledRequests,
        completionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
        averageResponseTimeHours: averageResponseTime / (1000 * 60 * 60), // Convert to hours
        totalEstimatedCost,
        totalActualCost,
        costVariance: totalEstimatedCost > 0 ? ((totalActualCost - totalEstimatedCost) / totalEstimatedCost) * 100 : 0,
      },
      breakdowns: {
        byCategory,
        byPriority,
        byStatus: {
          SUBMITTED: maintenanceRequests.filter(req => req.status === 'SUBMITTED').length,
          ACKNOWLEDGED: maintenanceRequests.filter(req => req.status === 'ACKNOWLEDGED').length,
          SCHEDULED: maintenanceRequests.filter(req => req.status === 'SCHEDULED').length,
          IN_PROGRESS: maintenanceRequests.filter(req => req.status === 'IN_PROGRESS').length,
          COMPLETED: completedRequests,
          CANCELLED: cancelledRequests,
        },
      },
      requests: maintenanceRequests.map(req => ({
        id: req.id,
        title: req.title,
        description: req.description,
        category: req.category,
        priority: req.priority,
        status: req.status,
        propertyTitle: req.lease.property?.title,
        unitNumber: req.lease.unit?.unitNumber,
        tenantName: req.lease.tenant?.name,
        submittedBy: req.submittedBy,
        createdAt: req.createdAt,
        scheduledDate: req.scheduledDate,
        completedDate: req.completedDate,
        estimatedCost: req.estimatedCost,
        actualCost: req.actualCost,
        tenantRating: req.tenantRating,
      })),
      generatedAt: new Date(),
    };

    // Handle different export formats
    if (format === "pdf") {
      const pdfBuffer = await exportToPDF(report, 'maintenance-report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-report-${start.toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportToExcel(report, 'maintenance-report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-report-${start.toISOString().split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    } else if (format === "csv") {
      const csvData = await exportToCSV(report, 'maintenance-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="maintenance-report-${start.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating maintenance report:", error);
    res.status(500).json({ error: "Failed to generate maintenance report" });
  }
});

// GET /reports/custom - Generate custom reports with flexible filtering
reportsRouter.get("/custom", requireAuth, requireSameAgency, async (req, res) => {
  try {
    const parsed = reportFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }

    const { startDate, endDate, propertyIds, agentIds, tenantIds, paymentMethods, status } = parsed.data;
    const { format = "json", reportType = "summary" } = req.query;
    const agencyId = req.user?.agencyId || req.agent?.agencyId;

    // Default to current month if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();

    // Build comprehensive filter
    const baseFilter = {
      agencyId,
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate && { gte: start }),
          ...(endDate && { lte: end }),
        }
      } : {}),
    };

    // Get data based on report type
    let reportData = {};

    if (reportType === "payments" || reportType === "summary") {
      const paymentFilter = {
        ...baseFilter,
        ...(paymentMethods && { method: { in: paymentMethods } }),
        ...(propertyIds && {
          lease: {
            OR: [
              { propertyId: { in: propertyIds } },
              { unit: { propertyId: { in: propertyIds } } }
            ]
          }
        }),
        paidAt: {
          ...(startDate && { gte: start }),
          ...(endDate && { lte: end }),
        },
      };

      const payments = await prisma.payment.findMany({
        where: paymentFilter,
        include: {
          lease: {
            include: {
              property: { select: { title: true } },
              unit: { select: { unitNumber: true } },
              tenant: { select: { name: true } },
            },
          },
        },
        orderBy: { paidAt: 'desc' },
      });

      reportData.payments = {
        total: payments.reduce((sum, p) => sum + p.amount, 0),
        count: payments.length,
        byMethod: payments.reduce((acc, p) => {
          acc[p.method] = (acc[p.method] || 0) + p.amount;
          return acc;
        }, {}),
        details: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          method: p.method,
          paidAt: p.paidAt,
          propertyTitle: p.lease.property?.title,
          unitNumber: p.lease.unit?.unitNumber,
          tenantName: p.lease.tenant?.name,
          referenceNumber: p.referenceNumber,
        })),
      };
    }

    if (reportType === "tenants" || reportType === "summary") {
      const tenantFilter = {
        agencyId,
        ...(tenantIds && { id: { in: tenantIds } }),
      };

      const tenants = await prisma.tenant.findMany({
        where: tenantFilter,
        include: {
          leases: {
            include: {
              property: { select: { title: true } },
              unit: { select: { unitNumber: true } },
              payments: {
                where: {
                  paidAt: { gte: start, lte: end },
                },
              },
            },
          },
        },
      });

      reportData.tenants = {
        total: tenants.length,
        details: tenants.map(t => ({
          id: t.id,
          name: t.name,
          email: t.email,
          phone: t.phone,
          averageRating: t.averageRating,
          isHighRisk: t.isHighRisk,
          activeLeases: t.leases.filter(l => !l.endDate || l.endDate > new Date()).length,
          totalPayments: t.leases.reduce((sum, l) => 
            sum + l.payments.reduce((pSum, p) => pSum + p.amount, 0), 0
          ),
        })),
      };
    }

    if (reportType === "properties" || reportType === "summary") {
      const propertyFilter = {
        agencyId,
        ...(propertyIds && { id: { in: propertyIds } }),
      };

      const properties = await prisma.property.findMany({
        where: propertyFilter,
        include: {
          leases: {
            where: {
              OR: [
                { endDate: null },
                { endDate: { gte: new Date() } },
              ],
            },
            include: {
              tenant: { select: { name: true } },
              payments: {
                where: {
                  paidAt: { gte: start, lte: end },
                },
              },
            },
          },
          units: {
            include: {
              leases: {
                where: {
                  OR: [
                    { endDate: null },
                    { endDate: { gte: new Date() } },
                  ],
                },
              },
            },
          },
        },
      });

      reportData.properties = {
        total: properties.length,
        details: properties.map(p => ({
          id: p.id,
          title: p.title,
          address: p.address,
          type: p.type,
          status: p.status,
          rentAmount: p.rentAmount,
          totalUnits: p.units.length || 1,
          occupiedUnits: p.units.length > 0 
            ? p.units.filter(u => u.leases.length > 0).length
            : (p.leases.length > 0 ? 1 : 0),
          totalRentCollected: p.leases.reduce((sum, l) => 
            sum + l.payments.reduce((pSum, payment) => pSum + payment.amount, 0), 0
          ),
        })),
      };
    }

    const report = {
      period: { start, end },
      filters: {
        propertyIds,
        agentIds,
        tenantIds,
        paymentMethods,
        status,
      },
      reportType,
      data: reportData,
      generatedAt: new Date(),
    };

    // Handle different export formats
    if (format === "pdf") {
      const pdfBuffer = await exportToPDF(report, 'custom-report');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="custom-report-${start.toISOString().split('T')[0]}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === "excel") {
      const excelBuffer = await exportToExcel(report, 'custom-report');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="custom-report-${start.toISOString().split('T')[0]}.xlsx"`);
      return res.send(excelBuffer);
    } else if (format === "csv") {
      const csvData = await exportToCSV(report, 'custom-report');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="custom-report-${start.toISOString().split('T')[0]}.csv"`);
      return res.send(csvData);
    }

    res.json(report);
  } catch (error) {
    console.error("Error generating custom report:", error);
    res.status(500).json({ error: "Failed to generate custom report" });
  }
});

// Helper function to calculate average tenancy duration
async function calculateAverageTenancyDuration(agencyId, startDate, endDate) {
  try {
    const completedLeases = await prisma.lease.findMany({
      where: {
        agencyId,
        endDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    if (completedLeases.length === 0) return 0;

    const totalDuration = completedLeases.reduce((sum, lease) => {
      const duration = new Date(lease.endDate) - new Date(lease.startDate);
      return sum + duration;
    }, 0);

    // Return average duration in days
    return totalDuration / (completedLeases.length * 1000 * 60 * 60 * 24);
  } catch (error) {
    console.error("Error calculating average tenancy duration:", error);
    return 0;
  }
}