import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * PDF Generator Service
 * Generates PDF reports from HTML templates
 */

class PDFGenerator {
  constructor() {
    this.templatesDir = path.join(process.cwd(), 'src', 'templates', 'pdf');
  }

  /**
   * Generate Financial Report PDF
   */
  async generateFinancialReportPDF(reportData) {
    try {
      const html = this.generateFinancialReportHTML(reportData);
      
      // For now, return HTML that can be converted to PDF on client side
      // or use a headless browser service
      return {
        html,
        filename: `financial-report-${reportData.agencyId}-${Date.now()}.pdf`,
        contentType: 'text/html', // Change to 'application/pdf' when using actual PDF generation
      };
    } catch (error) {
      logger.error('Error generating financial report PDF:', error);
      throw error;
    }
  }

  /**
   * Generate Expense Report PDF
   */
  async generateExpenseReportPDF(expenses, summary) {
    try {
      const html = this.generateExpenseReportHTML(expenses, summary);
      
      return {
        html,
        filename: `expense-report-${Date.now()}.pdf`,
        contentType: 'text/html',
      };
    } catch (error) {
      logger.error('Error generating expense report PDF:', error);
      throw error;
    }
  }

  /**
   * Generate Invoice PDF
   */
  async generateInvoicePDF(invoice) {
    try {
      const html = this.generateInvoiceHTML(invoice);
      
      return {
        html,
        filename: `invoice-${invoice.id}.pdf`,
        contentType: 'text/html',
      };
    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Generate Financial Report HTML
   */
  generateFinancialReportHTML(reportData) {
    const { period, revenue, expenses, netIncome, properties, payments } = reportData;
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Financial Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .section {
      margin: 30px 0;
    }
    .section h2 {
      color: #2563eb;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 20px 0;
    }
    .summary-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
    }
    .summary-card .amount {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }
    .summary-card.positive .amount {
      color: #10b981;
    }
    .summary-card.negative .amount {
      color: #ef4444;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #2563eb;
      color: white;
      padding: 12px;
      text-align: left;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #666;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
    @media print {
      body { margin: 20px; }
      .summary-grid { page-break-inside: avoid; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Financial Report</h1>
    <p>Period: ${period.startDate} to ${period.endDate}</p>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card positive">
        <h3>Total Revenue</h3>
        <div class="amount">KES ${revenue.toLocaleString()}</div>
      </div>
      <div class="summary-card negative">
        <h3>Total Expenses</h3>
        <div class="amount">KES ${expenses.toLocaleString()}</div>
      </div>
      <div class="summary-card ${netIncome >= 0 ? 'positive' : 'negative'}">
        <h3>Net Income</h3>
        <div class="amount">KES ${netIncome.toLocaleString()}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Property Performance</h2>
    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>Units</th>
          <th>Occupied</th>
          <th>Revenue</th>
          <th>Occupancy Rate</th>
        </tr>
      </thead>
      <tbody>
        ${properties.map(prop => `
          <tr>
            <td>${prop.title}</td>
            <td>${prop.totalUnits}</td>
            <td>${prop.occupiedUnits}</td>
            <td>KES ${prop.revenue.toLocaleString()}</td>
            <td>${prop.occupancyRate}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recent Payments</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Tenant</th>
          <th>Property</th>
          <th>Amount</th>
          <th>Method</th>
        </tr>
      </thead>
      <tbody>
        ${payments.slice(0, 10).map(payment => `
          <tr>
            <td>${new Date(payment.paidAt).toLocaleDateString()}</td>
            <td>${payment.tenant?.name || 'N/A'}</td>
            <td>${payment.property?.title || 'N/A'}</td>
            <td>KES ${payment.amount.toLocaleString()}</td>
            <td>${payment.method}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>This is a computer-generated report. No signature required.</p>
    <p>&copy; ${new Date().getFullYear()} Haven Property Management System</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate Expense Report HTML
   */
  generateExpenseReportHTML(expenses, summary) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Expense Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ef4444; padding-bottom: 20px; }
    .header h1 { color: #ef4444; margin: 0; }
    .summary { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .summary h3 { margin: 0 0 10px 0; color: #991b1b; }
    .summary .total { font-size: 32px; font-weight: bold; color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #ef4444; color: white; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .category-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; background: #e5e7eb; }
    .status-approved { color: #10b981; font-weight: bold; }
    .status-pending { color: #f59e0b; font-weight: bold; }
    .status-rejected { color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Expense Report</h1>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="summary">
    <h3>Total Expenses</h3>
    <div class="total">KES ${summary.total.toLocaleString()}</div>
    <p>Total Items: ${summary.count}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Category</th>
        <th>Description</th>
        <th>Property</th>
        <th>Amount</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.map(expense => `
        <tr>
          <td>${new Date(expense.expenseDate).toLocaleDateString()}</td>
          <td><span class="category-badge">${expense.category}</span></td>
          <td>${expense.description}</td>
          <td>${expense.property?.title || 'General'}</td>
          <td>KES ${expense.amount.toLocaleString()}</td>
          <td class="status-${expense.status.toLowerCase()}">${expense.status}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Haven Property Management System</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate Invoice HTML
   */
  generateInvoiceHTML(invoice) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.id}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .invoice-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .invoice-title { font-size: 32px; font-weight: bold; color: #2563eb; }
    .invoice-details { text-align: right; }
    .section { margin: 30px 0; }
    .section h3 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .total-row { font-weight: bold; font-size: 18px; background: #f9fafb; }
  </style>
</head>
<body>
  <div class="invoice-header">
    <div>
      <div class="invoice-title">INVOICE</div>
      <p>Invoice #: ${invoice.id}</p>
      <p>Date: ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
      <p>Due Date: ${new Date(invoice.dueAt).toLocaleDateString()}</p>
    </div>
    <div class="invoice-details">
      <h3>Bill To:</h3>
      <p><strong>${invoice.lease?.tenant?.name || 'N/A'}</strong></p>
      <p>${invoice.lease?.property?.title || 'N/A'}</p>
      <p>Unit: ${invoice.lease?.unit?.unitNumber || 'N/A'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Period</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Rent Payment</td>
        <td>${invoice.periodYear}-${String(invoice.periodMonth).padStart(2, '0')}</td>
        <td>KES ${invoice.amount.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Total Amount</td>
        <td>KES ${invoice.amount.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="2">Amount Paid</td>
        <td>KES ${invoice.totalPaid.toLocaleString()}</td>
      </tr>
      <tr class="total-row">
        <td colspan="2">Balance Due</td>
        <td>KES ${(invoice.amount - invoice.totalPaid).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="section">
    <h3>Payment Instructions</h3>
    <p>Please make payment via M-Pesa or bank transfer.</p>
    <p>Reference: Invoice ${invoice.id}</p>
  </div>

  <div class="footer">
    <p>&copy; ${new Date().getFullYear()} Haven Property Management System</p>
  </div>
</body>
</html>
    `.trim();
  }
}

export default new PDFGenerator();
