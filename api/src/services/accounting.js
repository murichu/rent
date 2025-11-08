import { prisma } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Accounting & Financial Reconciliation Service
 * Generate ledgers, financial summaries, and reconciliation reports
 */

/**
 * Generate general ledger for period
 */
export async function generateGeneralLedger(agencyId, startDate, endDate) {
  const transactions = [];

  // Get all payments (income)
  const payments = await prisma.payment.findMany({
    where: {
      agencyId,
      paidAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
    },
  });

  payments.forEach(payment => {
    transactions.push({
      date: payment.paidAt,
      type: 'INCOME',
      category: 'RENT_PAYMENT',
      description: `Rent payment from ${payment.lease.tenant.name}`,
      debit: 0,
      credit: payment.amount,
      balance: 0, // Will calculate running balance
      reference: payment.referenceNumber,
      property: payment.lease.property?.title,
    });
  });

  // Get all expenses (outflow)
  const expenses = await prisma.expense.findMany({
    where: {
      agencyId,
      status: 'APPROVED',
      expenseDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      property: true,
    },
  });

  expenses.forEach(expense => {
    transactions.push({
      date: expense.expenseDate,
      type: 'EXPENSE',
      category: expense.category,
      description: expense.description,
      debit: expense.amount,
      credit: 0,
      balance: 0,
      reference: expense.id,
      property: expense.property?.title,
    });
  });

  // Get penalties (income)
  const penalties = await prisma.penalty.findMany({
    where: {
      agencyId,
      computedAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    include: {
      lease: {
        include: {
          tenant: true,
          property: true,
        },
      },
    },
  });

  penalties.forEach(penalty => {
    transactions.push({
      date: penalty.computedAt,
      type: 'INCOME',
      category: 'LATE_FEE',
      description: `Late payment penalty - ${penalty.lease?.tenant.name}`,
      debit: 0,
      credit: penalty.amount,
      balance: 0,
      reference: penalty.id,
      property: penalty.lease?.property?.title,
    });
  });

  // Sort by date
  transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate running balance
  let runningBalance = 0;
  transactions.forEach(t => {
    runningBalance += t.credit - t.debit;
    t.balance = runningBalance;
  });

  logger.info('General ledger generated:', {
    agencyId,
    transactions: transactions.length,
    period: `${startDate} to ${endDate}`,
  });

  return transactions;
}

/**
 * Generate monthly financial summary
 */
export async function generateMonthlySummary(agencyId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const [
    totalIncome,
    totalExpenses,
    totalPenalties,
    occupancyStats,
  ] = await Promise.all([
    // Total income (payments)
    prisma.payment.aggregate({
      where: {
        agencyId,
        paidAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    
    // Total expenses
    prisma.expense.aggregate({
      where: {
        agencyId,
        status: 'APPROVED',
        expenseDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    
    // Total penalties
    prisma.penalty.aggregate({
      where: {
        agencyId,
        computedAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    }),
    
    // Occupancy
    prisma.lease.count({
      where: {
        agencyId,
        startDate: { lte: endDate },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } },
        ],
      },
    }),
  ]);

  const income = (totalIncome._sum.amount || 0) + (totalPenalties._sum.amount || 0);
  const expenses = totalExpenses._sum.amount || 0;
  const netIncome = income - expenses;

  const summary = {
    period: { year, month, startDate, endDate },
    income: {
      rent: totalIncome._sum.amount || 0,
      penalties: totalPenalties._sum.amount || 0,
      total: income,
      count: totalIncome._count + totalPenalties._count,
    },
    expenses: {
      total: expenses,
      count: totalExpenses._count,
    },
    netIncome,
    occupancy: {
      occupied: occupancyStats,
    },
  };

  logger.info('Monthly summary generated:', summary);

  return summary;
}

/**
 * Generate annual financial summary
 */
export async function generateAnnualSummary(agencyId, year) {
  const monthlySummaries = [];

  for (let month = 1; month <= 12; month++) {
    const summary = await generateMonthlySummary(agencyId, year, month);
    monthlySummaries.push(summary);
  }

  const annual = {
    year,
    totalIncome: monthlySummaries.reduce((sum, m) => sum + m.income.total, 0),
    totalExpenses: monthlySummaries.reduce((sum, m) => sum + m.expenses.total, 0),
    netIncome: monthlySummaries.reduce((sum, m) => sum + m.netIncome, 0),
    months: monthlySummaries,
  };

  logger.info('Annual summary generated:', {
    year,
    totalIncome: annual.totalIncome,
    netIncome: annual.netIncome,
  });

  return annual;
}

/**
 * Reconcile payments with invoices
 */
export async function reconcilePayments(agencyId, month, year) {
  const invoices = await prisma.invoice.findMany({
    where: {
      agencyId,
      periodYear: year,
      periodMonth: month,
    },
    include: {
      payments: true,
      lease: {
        include: {
          tenant: true,
        },
      },
    },
  });

  const reconciliation = [];

  for (const invoice of invoices) {
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = invoice.amount - totalPaid;

    let status = 'MATCHED';
    if (balance > 0) status = 'UNDERPAID';
    if (balance < 0) status = 'OVERPAID';

    reconciliation.push({
      invoiceId: invoice.id,
      tenant: invoice.lease.tenant.name,
      invoiceAmount: invoice.amount,
      totalPaid,
      balance,
      status,
      paymentCount: invoice.payments.length,
    });
  }

  logger.info('Payment reconciliation completed:', {
    agencyId,
    period: `${year}-${month}`,
    invoices: invoices.length,
  });

  return reconciliation;
}
