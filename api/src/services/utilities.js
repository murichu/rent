import { prisma } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Utility Bills Management Service
 * For Water and Electricity bills in Kenya properties
 */

/**
 * Create utility bill
 */
export async function createUtilityBill(data) {
  const {
    leaseId,
    type, // 'WATER' or 'ELECTRICITY'
    meterNumber,
    previousReading,
    currentReading,
    ratePerUnit,
    month,
    year,
    dueDate,
  } = data;

  const units = currentReading - previousReading;
  const amount = Math.round(units * ratePerUnit);

  const bill = await prisma.utilityBill.create({
    data: {
      leaseId,
      type,
      meterNumber,
      previousReading,
      currentReading,
      units,
      ratePerUnit,
      amount,
      month,
      year,
      dueDate: new Date(dueDate),
      status: 'PENDING',
    },
  });

  logger.info('Utility bill created:', {
    id: bill.id,
    type,
    amount,
    units,
  });

  return bill;
}

/**
 * Record meter reading with photo
 */
export async function recordMeterReading(utilityBillId, reading, photoUrl = null) {
  const bill = await prisma.utilityBill.update({
    where: { id: utilityBillId },
    data: {
      currentReading: reading,
      meterPhotoUrl: photoUrl,
      units: reading - bill.previousReading,
      amount: Math.round((reading - bill.previousReading) * bill.ratePerUnit),
      updatedAt: new Date(),
    },
  });

  logger.info('Meter reading recorded:', {
    billId: utilityBillId,
    reading,
    units: bill.units,
  });

  return bill;
}

/**
 * Get utility bills for lease
 */
export async function getUtilityBillsByLease(leaseId, filters = {}) {
  const where = { leaseId };
  
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.year) where.year = filters.year;

  return await prisma.utilityBill.findMany({
    where,
    orderBy: { year: 'desc', month: 'desc' },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
    },
  });
}

/**
 * Mark utility bill as paid
 */
export async function markUtilityBillPaid(utilityBillId, paymentMethod, referenceNumber) {
  const bill = await prisma.utilityBill.update({
    where: { id: utilityBillId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentMethod,
      paymentReference: referenceNumber,
    },
  });

  logger.info('Utility bill marked as paid:', {
    billId: utilityBillId,
    amount: bill.amount,
  });

  return bill;
}

/**
 * Calculate shared meter allocation
 * For properties with shared water/electricity meters
 */
export async function calculateSharedMeterAllocation(propertyId, totalUnits, month, year) {
  // Get all units in property
  const units = await prisma.unit.findMany({
    where: { propertyId },
    include: {
      leases: {
        where: {
          startDate: { lte: new Date(year, month - 1, 1) },
          OR: [
            { endDate: null },
            { endDate: { gte: new Date(year, month - 1, 1) } },
          ],
        },
      },
    },
  });

  // Calculate allocation based on unit size or equal split
  const occupiedUnits = units.filter(u => u.leases.length > 0);
  const totalSqFt = occupiedUnits.reduce((sum, u) => sum + (u.sizeSqFt || 0), 0);

  const allocations = [];

  for (const unit of occupiedUnits) {
    const allocation = totalSqFt > 0
      ? (unit.sizeSqFt / totalSqFt) * totalUnits // Proportional to size
      : totalUnits / occupiedUnits.length; // Equal split

    allocations.push({
      unitId: unit.id,
      leaseId: unit.leases[0].id,
      allocation: Math.round(allocation * 100) / 100,
    });
  }

  return allocations;
}

/**
 * Get utility consumption statistics
 */
export async function getUtilityStatistics(leaseId, type, months = 6) {
  const bills = await prisma.utilityBill.findMany({
    where: {
      leaseId,
      type,
    },
    orderBy: { year: 'desc', month: 'desc' },
    take: months,
  });

  const avgUnits = bills.reduce((sum, b) => sum + b.units, 0) / bills.length;
  const avgAmount = bills.reduce((sum, b) => sum + b.amount, 0) / bills.length;
  const trend = bills.length >= 2 
    ? ((bills[0].units - bills[1].units) / bills[1].units) * 100
    : 0;

  return {
    averageUnits: Math.round(avgUnits * 100) / 100,
    averageAmount: Math.round(avgAmount),
    trend: Math.round(trend * 100) / 100,
    history: bills,
  };
}
