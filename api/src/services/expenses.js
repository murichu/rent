import { prisma } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Expense Management Service
 * Track property-related expenses
 */

/**
 * Create expense
 */
export async function createExpense(data) {
  const {
    propertyId,
    category,
    amount,
    description,
    date,
    payee,
    paymentMethod,
    receiptUrl,
    agencyId,
    requiresApproval,
  } = data;

  const expense = await prisma.expense.create({
    data: {
      propertyId,
      agencyId,
      category,
      amount,
      description,
      expenseDate: new Date(date),
      payee,
      paymentMethod,
      receiptUrl,
      status: requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED',
      approvalRequired: requiresApproval || false,
    },
  });

  logger.info('Expense created:', {
    id: expense.id,
    category,
    amount,
  });

  return expense;
}

/**
 * Approve expense
 */
export async function approveExpense(expenseId, approverId, notes = null) {
  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
      approvalNotes: notes,
    },
  });

  logger.info('Expense approved:', {
    expenseId,
    approverId,
  });

  return expense;
}

/**
 * Reject expense
 */
export async function rejectExpense(expenseId, approverId, reason) {
  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      status: 'REJECTED',
      approvedBy: approverId,
      approvedAt: new Date(),
      approvalNotes: reason,
    },
  });

  logger.info('Expense rejected:', {
    expenseId,
    reason,
  });

  return expense;
}

/**
 * Get expenses by property
 */
export async function getExpensesByProperty(propertyId, filters = {}) {
  const where = { propertyId };
  
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;
  if (filters.startDate && filters.endDate) {
    where.expenseDate = {
      gte: new Date(filters.startDate),
      lte: new Date(filters.endDate),
    };
  }

  return await prisma.expense.findMany({
    where,
    orderBy: { expenseDate: 'desc' },
    include: {
      property: true,
    },
  });
}

/**
 * Get expense summary
 */
export async function getExpenseSummary(agencyId, startDate, endDate) {
  const expenses = await prisma.expense.findMany({
    where: {
      agencyId,
      status: 'APPROVED',
      expenseDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  const summary = {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory: {},
    byProperty: {},
    count: expenses.length,
  };

  expenses.forEach(expense => {
    // By category
    if (!summary.byCategory[expense.category]) {
      summary.byCategory[expense.category] = 0;
    }
    summary.byCategory[expense.category] += expense.amount;

    // By property
    if (expense.propertyId) {
      if (!summary.byProperty[expense.propertyId]) {
        summary.byProperty[expense.propertyId] = 0;
      }
      summary.byProperty[expense.propertyId] += expense.amount;
    }
  });

  return summary;
}
