import PDFDocument from 'pdfkit';
import { prisma } from '../db.js';
import logger from '../utils/logger.js';

/**
 * Invoice Branding Service
 * Handles comprehensive branding for invoices including agency and property-specific branding
 */
class InvoiceBrandingService {
  constructor() {
    this.defaultColors = {
      primary: '#2563eb',
      secondary: '#64748b',
      accent: '#059669',
      text: '#1f2937',
      lightText: '#6b7280',
      background: '#ffffff',
      border: '#e5e7eb'
    };

    this.defaultFonts = {
      heading: 'Helvetica-Bold',
      subheading: 'Helvetica',
      body: 'Helvetica',
      small: 'Helvetica'
    };
  }

  /**
   * Get comprehensive branding for an invoice
   */
  async getInvoiceBranding(invoiceId, options = {}) {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          lease: {
            include: {
              tenant: true,
              property: {
                include: {
                  managers: {
                    include: {
                      user: true
                    }
                  }
                }
              },
              unit: true
            }
          },
          agency: {
            include: {
              settings: true
            }
          },
          payments: {
            orderBy: { paidAt: 'desc' }
          },
          penalties: true
        }
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get branding hierarchy: Property Manager > Agency > Default
      const branding = await this.buildBrandingHierarchy(invoice, options);
      
      // Calculate invoice totals
      const calculations = this.calculateInvoiceTotals(invoice);
      
      // Build comprehensive branded invoice data
      return {
        invoice,
        branding,
        calculations,
        layout: this.getLayoutOptions(branding),
        styling: this.getStylingOptions(branding),
        content: await this.getContentSections(invoice, branding, calculations)
      };
    } catch (error) {
      logger.error('Error getting invoice branding:', error);
      throw error;
    }
  }

  /**
   * Build branding hierarchy from property manager, agency, and defaults
   */
  async buildBrandingHierarchy(invoice, options = {}) {
    const agencySettings = invoice.agency.settings || {};
    const property = invoice.lease.property;
    
    // Check for property manager branding (highest priority)
    let propertyManagerBranding = null;
    if (property.managers && property.managers.length > 0) {
      const primaryManager = property.managers.find(m => m.role === 'LANDLORD') || property.managers[0];
      if (primaryManager && options.usePropertyManagerBranding !== false) {
        propertyManagerBranding = await this.getPropertyManagerBranding(primaryManager.userId);
      }
    }

    // Build final branding with hierarchy
    const branding = {
      // Business Information (Property Manager > Agency > Default)
      businessName: propertyManagerBranding?.businessName || agencySettings.businessName || invoice.agency.name,
      businessAddress: propertyManagerBranding?.businessAddress || agencySettings.businessAddress,
      businessPhone: propertyManagerBranding?.businessPhone || agencySettings.businessPhone,
      businessEmail: propertyManagerBranding?.businessEmail || agencySettings.businessEmail,
      businessWebsite: propertyManagerBranding?.businessWebsite || agencySettings.businessWebsite,
      businessLicense: propertyManagerBranding?.businessLicense || agencySettings.businessLicense,
      taxId: propertyManagerBranding?.taxId || agencySettings.taxId,

      // Visual Branding
      logoUrl: propertyManagerBranding?.logoUrl || agencySettings.businessLogo,
      primaryColor: propertyManagerBranding?.primaryColor || agencySettings.primaryColor || this.defaultColors.primary,
      secondaryColor: propertyManagerBranding?.secondaryColor || agencySettings.secondaryColor || this.defaultColors.secondary,
      accentColor: propertyManagerBranding?.accentColor || this.defaultColors.accent,

      // Invoice Specific Settings
      invoicePrefix: propertyManagerBranding?.invoicePrefix || agencySettings.invoicePrefix || 'INV',
      currency: agencySettings.defaultCurrency || 'KES',
      showWatermark: propertyManagerBranding?.showWatermark || agencySettings.showWatermark || false,
      watermarkText: propertyManagerBranding?.watermarkText || agencySettings.watermarkText || 'CONFIDENTIAL',

      // Footer Information
      footerText: propertyManagerBranding?.footerText || agencySettings.footerText,
      termsOfService: agencySettings.termsOfServiceUrl,
      privacyPolicy: agencySettings.privacyPolicyUrl,

      // Branding Source
      brandingSource: propertyManagerBranding ? 'property_manager' : 'agency',
      propertyManagerInfo: propertyManagerBranding ? {
        name: primaryManager?.user?.name,
        role: primaryManager?.role
      } : null
    };

    return branding;
  }

  /**
   * Get property manager specific branding
   */
  async getPropertyManagerBranding(userId) {
    try {
      const userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        include: {
          user: true
        }
      });

      if (!userSettings || !userSettings.enableCustomBranding) {
        return null;
      }

      return {
        businessName: userSettings.businessName,
        businessAddress: userSettings.businessAddress,
        businessPhone: userSettings.businessPhone,
        businessEmail: userSettings.businessEmail,
        businessWebsite: userSettings.businessWebsite,
        businessLicense: userSettings.businessLicense,
        taxId: userSettings.taxId,
        logoUrl: userSettings.logoUrl,
        primaryColor: userSettings.primaryColor,
        secondaryColor: userSettings.secondaryColor,
        accentColor: userSettings.accentColor,
        invoicePrefix: userSettings.invoicePrefix,
        showWatermark: userSettings.showWatermark,
        watermarkText: userSettings.watermarkText,
        footerText: userSettings.footerText
      };
    } catch (error) {
      logger.error('Error getting property manager branding:', error);
      return null;
    }
  }

  /**
   * Calculate invoice totals and balances
   */
  calculateInvoiceTotals(invoice) {
    const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPenalties = invoice.penalties.reduce((sum, penalty) => sum + penalty.amount, 0);
    const subtotal = invoice.amount;
    const totalAmount = subtotal + totalPenalties;
    const balanceDue = totalAmount - totalPaid;
    const isOverdue = new Date() > new Date(invoice.dueAt) && balanceDue > 0;

    return {
      subtotal,
      penalties: totalPenalties,
      totalAmount,
      totalPaid,
      balanceDue,
      isOverdue,
      paymentStatus: balanceDue <= 0 ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'
    };
  }

  /**
   * Get layout options based on branding
   */
  getLayoutOptions(branding) {
    return {
      pageSize: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50
      },
      headerHeight: branding.logoUrl ? 120 : 80,
      footerHeight: 60,
      sectionSpacing: 20,
      lineHeight: 1.2
    };
  }

  /**
   * Get styling options based on branding
   */
  getStylingOptions(branding) {
    return {
      colors: {
        primary: branding.primaryColor,
        secondary: branding.secondaryColor,
        accent: branding.accentColor,
        text: this.defaultColors.text,
        lightText: this.defaultColors.lightText,
        background: this.defaultColors.background,
        border: this.defaultColors.border
      },
      fonts: this.defaultFonts,
      fontSizes: {
        title: 24,
        heading: 18,
        subheading: 14,
        body: 10,
        small: 8
      },
      borderRadius: 4,
      shadowColor: 'rgba(0, 0, 0, 0.1)'
    };
  }

  /**
   * Get content sections for the invoice
   */
  async getContentSections(invoice, branding, calculations) {
    return {
      header: {
        businessInfo: {
          name: branding.businessName,
          address: branding.businessAddress,
          phone: branding.businessPhone,
          email: branding.businessEmail,
          website: branding.businessWebsite,
          license: branding.businessLicense,
          taxId: branding.taxId
        },
        logoUrl: branding.logoUrl,
        invoiceInfo: {
          number: `${branding.invoicePrefix}-${invoice.id.slice(-8).toUpperCase()}`,
          date: invoice.issuedAt,
          dueDate: invoice.dueAt,
          period: `${new Date(invoice.periodYear, invoice.periodMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
        }
      },
      billTo: {
        tenant: {
          name: invoice.lease.tenant.name,
          email: invoice.lease.tenant.email,
          phone: invoice.lease.tenant.phone
        },
        property: {
          title: invoice.lease.property.title,
          address: invoice.lease.property.address,
          city: invoice.lease.property.city,
          state: invoice.lease.property.state,
          zip: invoice.lease.property.zip,
          unitNumber: invoice.lease.unit?.unitNumber
        }
      },
      lineItems: [
        {
          description: `Rent - ${invoice.lease.property.title}${invoice.lease.unit?.unitNumber ? ` Unit ${invoice.lease.unit.unitNumber}` : ''}`,
          period: `${new Date(invoice.periodYear, invoice.periodMonth - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
          amount: invoice.amount,
          type: 'rent'
        },
        ...invoice.penalties.map(penalty => ({
          description: `${penalty.type.replace('_', ' ')} Penalty`,
          period: `${penalty.days} days`,
          amount: penalty.amount,
          type: 'penalty'
        }))
      ],
      totals: calculations,
      paymentHistory: invoice.payments.map(payment => ({
        date: payment.paidAt,
        amount: payment.amount,
        method: payment.method,
        reference: payment.referenceNumber,
        notes: payment.notes
      })),
      footer: {
        text: branding.footerText,
        termsUrl: branding.termsOfService,
        privacyUrl: branding.privacyPolicy,
        watermark: branding.showWatermark ? branding.watermarkText : null
      }
    };
  }

  /**
   * Generate branded PDF invoice
   */
  async generateBrandedPDF(invoiceId, options = {}) {
    try {
      const brandedInvoice = await this.getInvoiceBranding(invoiceId, options);
      const { branding, layout, styling, content, calculations } = brandedInvoice;

      const doc = new PDFDocument({
        size: layout.pageSize,
        margin: layout.margins.top
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));

      // Add watermark if enabled
      if (content.footer.watermark) {
        this.addWatermark(doc, content.footer.watermark, styling);
      }

      // Header Section
      await this.addHeader(doc, content.header, styling, layout);

      // Bill To Section
      this.addBillToSection(doc, content.billTo, styling);

      // Line Items Section
      this.addLineItemsSection(doc, content.lineItems, styling, branding.currency);

      // Totals Section
      this.addTotalsSection(doc, calculations, styling, branding.currency);

      // Payment History Section (if payments exist)
      if (content.paymentHistory.length > 0) {
        this.addPaymentHistorySection(doc, content.paymentHistory, styling, branding.currency);
      }

      // Footer Section
      this.addFooter(doc, content.footer, styling);

      doc.end();

      return new Promise((resolve) => {
        doc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      });
    } catch (error) {
      logger.error('Error generating branded PDF:', error);
      throw error;
    }
  }

  /**
   * Add watermark to PDF
   */
  addWatermark(doc, watermarkText, styling) {
    doc.save()
      .fontSize(60)
      .fillColor(styling.colors.border)
      .opacity(0.1)
      .rotate(45, { origin: [300, 400] })
      .text(watermarkText, 200, 350, {
        align: 'center',
        width: 400
      })
      .restore();
  }

  /**
   * Add header section to PDF
   */
  async addHeader(doc, header, styling, layout) {
    const startY = doc.y;

    // Add logo if available
    if (header.logoUrl) {
      try {
        // Note: In a real implementation, you'd fetch and add the logo image
        // doc.image(logoBuffer, 50, startY, { width: 100, height: 60 });
        doc.fontSize(styling.fontSizes.small)
          .fillColor(styling.colors.lightText)
          .text('[LOGO]', 50, startY, { width: 100, height: 60, align: 'center' });
      } catch (error) {
        logger.warn('Could not load logo:', error);
      }
    }

    // Business Information (right side)
    const businessInfoX = header.logoUrl ? 400 : 50;
    doc.fontSize(styling.fontSizes.heading)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.heading)
      .text(header.businessInfo.name, businessInfoX, startY, { align: 'right' });

    let currentY = doc.y + 5;

    if (header.businessInfo.address) {
      doc.fontSize(styling.fontSizes.body)
        .fillColor(styling.colors.text)
        .font(styling.fonts.body)
        .text(header.businessInfo.address, businessInfoX, currentY, { align: 'right' });
      currentY = doc.y + 3;
    }

    if (header.businessInfo.phone) {
      doc.text(`Phone: ${header.businessInfo.phone}`, businessInfoX, currentY, { align: 'right' });
      currentY = doc.y + 3;
    }

    if (header.businessInfo.email) {
      doc.text(`Email: ${header.businessInfo.email}`, businessInfoX, currentY, { align: 'right' });
      currentY = doc.y + 3;
    }

    if (header.businessInfo.website) {
      doc.fillColor(styling.colors.primary)
        .text(header.businessInfo.website, businessInfoX, currentY, { align: 'right' });
      currentY = doc.y + 3;
    }

    // Invoice Information (left side, below logo)
    const invoiceInfoY = startY + (header.logoUrl ? 80 : 40);
    doc.fontSize(styling.fontSizes.title)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.heading)
      .text('INVOICE', 50, invoiceInfoY);

    doc.fontSize(styling.fontSizes.body)
      .fillColor(styling.colors.text)
      .font(styling.fonts.body)
      .text(`Invoice #: ${header.invoiceInfo.number}`, 50, invoiceInfoY + 30)
      .text(`Date: ${new Date(header.invoiceInfo.date).toLocaleDateString()}`, 50, doc.y + 5)
      .text(`Due Date: ${new Date(header.invoiceInfo.dueDate).toLocaleDateString()}`, 50, doc.y + 5)
      .text(`Period: ${header.invoiceInfo.period}`, 50, doc.y + 5);

    doc.y = Math.max(currentY, doc.y) + layout.sectionSpacing;
  }

  /**
   * Add bill to section to PDF
   */
  addBillToSection(doc, billTo, styling) {
    const startY = doc.y;

    // Bill To Header
    doc.fontSize(styling.fontSizes.subheading)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.subheading)
      .text('BILL TO:', 50, startY);

    // Tenant Information
    doc.fontSize(styling.fontSizes.body)
      .fillColor(styling.colors.text)
      .font(styling.fonts.body)
      .text(billTo.tenant.name, 50, doc.y + 10);

    if (billTo.tenant.email) {
      doc.text(billTo.tenant.email, 50, doc.y + 5);
    }

    if (billTo.tenant.phone) {
      doc.text(billTo.tenant.phone, 50, doc.y + 5);
    }

    // Property Information (right side)
    doc.fontSize(styling.fontSizes.subheading)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.subheading)
      .text('PROPERTY:', 300, startY);

    doc.fontSize(styling.fontSizes.body)
      .fillColor(styling.colors.text)
      .font(styling.fonts.body)
      .text(billTo.property.title, 300, startY + 25);

    if (billTo.property.unitNumber) {
      doc.text(`Unit: ${billTo.property.unitNumber}`, 300, doc.y + 5);
    }

    const fullAddress = [
      billTo.property.address,
      billTo.property.city,
      billTo.property.state,
      billTo.property.zip
    ].filter(Boolean).join(', ');

    if (fullAddress) {
      doc.text(fullAddress, 300, doc.y + 5, { width: 200 });
    }

    doc.y += 30;
  }

  /**
   * Add line items section to PDF
   */
  addLineItemsSection(doc, lineItems, styling, currency) {
    const startY = doc.y;
    const tableTop = startY + 20;
    const itemCodeX = 50;
    const descriptionX = 120;
    const periodX = 350;
    const amountX = 450;

    // Table Header
    doc.fontSize(styling.fontSizes.body)
      .fillColor(styling.colors.background)
      .rect(50, startY, 500, 20)
      .fill(styling.colors.primary);

    doc.fillColor(styling.colors.background)
      .font(styling.fonts.subheading)
      .text('Item', itemCodeX + 5, startY + 6)
      .text('Description', descriptionX + 5, startY + 6)
      .text('Period', periodX + 5, startY + 6)
      .text('Amount', amountX + 5, startY + 6);

    let currentY = tableTop;

    // Table Rows
    lineItems.forEach((item, index) => {
      const rowColor = index % 2 === 0 ? styling.colors.background : '#f9fafb';
      
      doc.fillColor(rowColor)
        .rect(50, currentY, 500, 25)
        .fill();

      doc.fontSize(styling.fontSizes.body)
        .fillColor(styling.colors.text)
        .font(styling.fonts.body)
        .text(item.type === 'rent' ? 'RENT' : 'PENALTY', itemCodeX + 5, currentY + 8)
        .text(item.description, descriptionX + 5, currentY + 8, { width: 220 })
        .text(item.period, periodX + 5, currentY + 8)
        .text(`${currency} ${item.amount.toLocaleString()}`, amountX + 5, currentY + 8);

      currentY += 25;
    });

    doc.y = currentY + 10;
  }

  /**
   * Add totals section to PDF
   */
  addTotalsSection(doc, calculations, styling, currency) {
    const startX = 350;
    const startY = doc.y;

    // Subtotal
    doc.fontSize(styling.fontSizes.body)
      .fillColor(styling.colors.text)
      .font(styling.fonts.body)
      .text('Subtotal:', startX, startY)
      .text(`${currency} ${calculations.subtotal.toLocaleString()}`, startX + 100, startY, { align: 'right', width: 100 });

    // Penalties (if any)
    if (calculations.penalties > 0) {
      doc.text('Penalties:', startX, doc.y + 5)
        .text(`${currency} ${calculations.penalties.toLocaleString()}`, startX + 100, doc.y, { align: 'right', width: 100 });
    }

    // Total Amount
    doc.fontSize(styling.fontSizes.subheading)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.subheading)
      .text('Total Amount:', startX, doc.y + 10)
      .text(`${currency} ${calculations.totalAmount.toLocaleString()}`, startX + 100, doc.y, { align: 'right', width: 100 });

    // Payments (if any)
    if (calculations.totalPaid > 0) {
      doc.fontSize(styling.fontSizes.body)
        .fillColor(styling.colors.text)
        .font(styling.fonts.body)
        .text('Total Paid:', startX, doc.y + 8)
        .text(`${currency} ${calculations.totalPaid.toLocaleString()}`, startX + 100, doc.y, { align: 'right', width: 100 });
    }

    // Balance Due
    const balanceColor = calculations.balanceDue > 0 ? 
      (calculations.isOverdue ? '#dc2626' : styling.colors.accent) : 
      styling.colors.accent;

    doc.fontSize(styling.fontSizes.subheading)
      .fillColor(balanceColor)
      .font(styling.fonts.subheading)
      .text('Balance Due:', startX, doc.y + 10)
      .text(`${currency} ${calculations.balanceDue.toLocaleString()}`, startX + 100, doc.y, { align: 'right', width: 100 });

    // Payment Status
    const statusText = calculations.paymentStatus === 'PAID' ? 'PAID IN FULL' :
                      calculations.paymentStatus === 'OVERDUE' ? 'OVERDUE' : 'PENDING';
    
    doc.fontSize(styling.fontSizes.small)
      .fillColor(balanceColor)
      .text(`Status: ${statusText}`, startX, doc.y + 8);

    doc.y += 30;
  }

  /**
   * Add payment history section to PDF
   */
  addPaymentHistorySection(doc, paymentHistory, styling, currency) {
    doc.fontSize(styling.fontSizes.subheading)
      .fillColor(styling.colors.primary)
      .font(styling.fonts.subheading)
      .text('Payment History', 50, doc.y);

    const tableTop = doc.y + 10;
    let currentY = tableTop;

    // Table Header
    doc.fontSize(styling.fontSizes.small)
      .fillColor(styling.colors.background)
      .rect(50, currentY, 500, 15)
      .fill(styling.colors.secondary);

    doc.fillColor(styling.colors.background)
      .text('Date', 55, currentY + 4)
      .text('Amount', 150, currentY + 4)
      .text('Method', 250, currentY + 4)
      .text('Reference', 350, currentY + 4);

    currentY += 15;

    // Payment Rows
    paymentHistory.slice(0, 5).forEach((payment, index) => {
      const rowColor = index % 2 === 0 ? styling.colors.background : '#f9fafb';
      
      doc.fillColor(rowColor)
        .rect(50, currentY, 500, 15)
        .fill();

      doc.fontSize(styling.fontSizes.small)
        .fillColor(styling.colors.text)
        .text(new Date(payment.date).toLocaleDateString(), 55, currentY + 4)
        .text(`${currency} ${payment.amount.toLocaleString()}`, 150, currentY + 4)
        .text(payment.method || 'N/A', 250, currentY + 4)
        .text(payment.reference || 'N/A', 350, currentY + 4, { width: 150 });

      currentY += 15;
    });

    doc.y = currentY + 20;
  }

  /**
   * Add footer section to PDF
   */
  addFooter(doc, footer, styling) {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 80;

    // Move to footer position
    doc.y = footerY;

    // Footer text
    if (footer.text) {
      doc.fontSize(styling.fontSizes.small)
        .fillColor(styling.colors.lightText)
        .font(styling.fonts.body)
        .text(footer.text, 50, footerY, { align: 'center', width: 500 });
    }

    // Terms and Privacy links
    if (footer.termsUrl || footer.privacyUrl) {
      const linksY = footerY + 20;
      let linksText = '';
      
      if (footer.termsUrl) {
        linksText += `Terms of Service: ${footer.termsUrl}`;
      }
      
      if (footer.privacyUrl) {
        if (linksText) linksText += ' | ';
        linksText += `Privacy Policy: ${footer.privacyUrl}`;
      }

      doc.fontSize(styling.fontSizes.small)
        .fillColor(styling.colors.primary)
        .text(linksText, 50, linksY, { align: 'center', width: 500 });
    }

    // Generation timestamp
    doc.fontSize(styling.fontSizes.small)
      .fillColor(styling.colors.lightText)
      .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 40, { align: 'center', width: 500 });
  }

  /**
   * Generate branded invoice HTML for web display
   */
  async generateBrandedHTML(invoiceId, options = {}) {
    try {
      const brandedInvoice = await this.getInvoiceBranding(invoiceId, options);
      const { branding, styling, content, calculations } = brandedInvoice;

      return {
        html: this.buildInvoiceHTML(content, styling, branding, calculations),
        css: this.buildInvoiceCSS(styling, branding),
        data: brandedInvoice
      };
    } catch (error) {
      logger.error('Error generating branded HTML:', error);
      throw error;
    }
  }

  /**
   * Build invoice HTML structure
   */
  buildInvoiceHTML(content, styling, branding, calculations) {
    return `
      <div class="invoice-container">
        ${content.footer.watermark ? `<div class="watermark">${content.footer.watermark}</div>` : ''}
        
        <div class="invoice-header">
          <div class="business-info">
            ${content.header.logoUrl ? `<img src="${content.header.logoUrl}" alt="Logo" class="logo" />` : ''}
            <div class="business-details">
              <h1 class="business-name">${content.header.businessInfo.name}</h1>
              ${content.header.businessInfo.address ? `<p class="address">${content.header.businessInfo.address}</p>` : ''}
              <div class="contact-info">
                ${content.header.businessInfo.phone ? `<span class="phone">Phone: ${content.header.businessInfo.phone}</span>` : ''}
                ${content.header.businessInfo.email ? `<span class="email">Email: ${content.header.businessInfo.email}</span>` : ''}
                ${content.header.businessInfo.website ? `<span class="website">${content.header.businessInfo.website}</span>` : ''}
              </div>
            </div>
          </div>
          
          <div class="invoice-info">
            <h2 class="invoice-title">INVOICE</h2>
            <div class="invoice-details">
              <p><strong>Invoice #:</strong> ${content.header.invoiceInfo.number}</p>
              <p><strong>Date:</strong> ${new Date(content.header.invoiceInfo.date).toLocaleDateString()}</p>
              <p><strong>Due Date:</strong> ${new Date(content.header.invoiceInfo.dueDate).toLocaleDateString()}</p>
              <p><strong>Period:</strong> ${content.header.invoiceInfo.period}</p>
            </div>
          </div>
        </div>

        <div class="bill-to-section">
          <div class="bill-to">
            <h3>BILL TO:</h3>
            <div class="tenant-info">
              <p class="tenant-name">${content.billTo.tenant.name}</p>
              ${content.billTo.tenant.email ? `<p class="tenant-email">${content.billTo.tenant.email}</p>` : ''}
              ${content.billTo.tenant.phone ? `<p class="tenant-phone">${content.billTo.tenant.phone}</p>` : ''}
            </div>
          </div>
          
          <div class="property-info">
            <h3>PROPERTY:</h3>
            <div class="property-details">
              <p class="property-title">${content.billTo.property.title}</p>
              ${content.billTo.property.unitNumber ? `<p class="unit">Unit: ${content.billTo.property.unitNumber}</p>` : ''}
              <p class="property-address">${[content.billTo.property.address, content.billTo.property.city, content.billTo.property.state, content.billTo.property.zip].filter(Boolean).join(', ')}</p>
            </div>
          </div>
        </div>

        <div class="line-items">
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Period</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${content.lineItems.map(item => `
                <tr class="item-row ${item.type}">
                  <td class="item-type">${item.type === 'rent' ? 'RENT' : 'PENALTY'}</td>
                  <td class="item-description">${item.description}</td>
                  <td class="item-period">${item.period}</td>
                  <td class="item-amount">${branding.currency} ${item.amount.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="totals-section">
          <div class="totals">
            <div class="total-line">
              <span class="label">Subtotal:</span>
              <span class="amount">${branding.currency} ${calculations.subtotal.toLocaleString()}</span>
            </div>
            ${calculations.penalties > 0 ? `
              <div class="total-line">
                <span class="label">Penalties:</span>
                <span class="amount">${branding.currency} ${calculations.penalties.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="total-line total-amount">
              <span class="label">Total Amount:</span>
              <span class="amount">${branding.currency} ${calculations.totalAmount.toLocaleString()}</span>
            </div>
            ${calculations.totalPaid > 0 ? `
              <div class="total-line">
                <span class="label">Total Paid:</span>
                <span class="amount">${branding.currency} ${calculations.totalPaid.toLocaleString()}</span>
              </div>
            ` : ''}
            <div class="total-line balance-due ${calculations.isOverdue ? 'overdue' : ''}">
              <span class="label">Balance Due:</span>
              <span class="amount">${branding.currency} ${calculations.balanceDue.toLocaleString()}</span>
            </div>
            <div class="payment-status ${calculations.paymentStatus.toLowerCase()}">
              Status: ${calculations.paymentStatus === 'PAID' ? 'PAID IN FULL' : calculations.paymentStatus}
            </div>
          </div>
        </div>

        ${content.paymentHistory.length > 0 ? `
          <div class="payment-history">
            <h3>Payment History</h3>
            <table class="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                ${content.paymentHistory.slice(0, 5).map(payment => `
                  <tr>
                    <td>${new Date(payment.date).toLocaleDateString()}</td>
                    <td>${branding.currency} ${payment.amount.toLocaleString()}</td>
                    <td>${payment.method || 'N/A'}</td>
                    <td>${payment.reference || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="invoice-footer">
          ${content.footer.text ? `<p class="footer-text">${content.footer.text}</p>` : ''}
          <div class="footer-links">
            ${content.footer.termsUrl ? `<a href="${content.footer.termsUrl}" target="_blank">Terms of Service</a>` : ''}
            ${content.footer.privacyUrl ? `<a href="${content.footer.privacyUrl}" target="_blank">Privacy Policy</a>` : ''}
          </div>
          <p class="generation-time">Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
  }

  /**
   * Build invoice CSS styles
   */
  buildInvoiceCSS(styling, branding) {
    return `
      .invoice-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        font-family: 'Helvetica', Arial, sans-serif;
        color: ${styling.colors.text};
        background: ${styling.colors.background};
        position: relative;
      }

      .watermark {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(45deg);
        font-size: 60px;
        color: ${styling.colors.border};
        opacity: 0.1;
        z-index: 0;
        pointer-events: none;
      }

      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid ${styling.colors.primary};
      }

      .business-info {
        display: flex;
        align-items: flex-start;
        gap: 20px;
      }

      .logo {
        max-width: 100px;
        max-height: 60px;
        object-fit: contain;
      }

      .business-name {
        font-size: ${styling.fontSizes.heading}px;
        color: ${styling.colors.primary};
        margin: 0 0 10px 0;
        font-weight: bold;
      }

      .address {
        margin: 0 0 8px 0;
        font-size: ${styling.fontSizes.body}px;
      }

      .contact-info {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: ${styling.fontSizes.body}px;
      }

      .website {
        color: ${styling.colors.primary};
      }

      .invoice-info {
        text-align: right;
      }

      .invoice-title {
        font-size: ${styling.fontSizes.title}px;
        color: ${styling.colors.primary};
        margin: 0 0 20px 0;
        font-weight: bold;
      }

      .invoice-details p {
        margin: 5px 0;
        font-size: ${styling.fontSizes.body}px;
      }

      .bill-to-section {
        display: flex;
        justify-content: space-between;
        margin-bottom: 30px;
      }

      .bill-to h3,
      .property-info h3 {
        color: ${styling.colors.primary};
        font-size: ${styling.fontSizes.subheading}px;
        margin: 0 0 10px 0;
        font-weight: bold;
      }

      .tenant-name,
      .property-title {
        font-weight: bold;
        margin-bottom: 5px;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
      }

      .items-table thead {
        background: ${styling.colors.primary};
        color: ${styling.colors.background};
      }

      .items-table th,
      .items-table td {
        padding: 12px 8px;
        text-align: left;
        border-bottom: 1px solid ${styling.colors.border};
      }

      .items-table th {
        font-weight: bold;
        font-size: ${styling.fontSizes.body}px;
      }

      .items-table td {
        font-size: ${styling.fontSizes.body}px;
      }

      .item-row:nth-child(even) {
        background-color: #f9fafb;
      }

      .item-row.penalty {
        background-color: #fef3c7;
      }

      .item-amount {
        text-align: right;
        font-weight: bold;
      }

      .totals-section {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 30px;
      }

      .totals {
        min-width: 300px;
      }

      .total-line {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid ${styling.colors.border};
      }

      .total-line.total-amount {
        font-weight: bold;
        font-size: ${styling.fontSizes.subheading}px;
        color: ${styling.colors.primary};
        border-bottom: 2px solid ${styling.colors.primary};
      }

      .total-line.balance-due {
        font-weight: bold;
        font-size: ${styling.fontSizes.subheading}px;
        color: ${styling.colors.accent};
      }

      .total-line.balance-due.overdue {
        color: #dc2626;
      }

      .payment-status {
        text-align: right;
        font-size: ${styling.fontSizes.small}px;
        margin-top: 5px;
        font-weight: bold;
      }

      .payment-status.paid {
        color: ${styling.colors.accent};
      }

      .payment-status.overdue {
        color: #dc2626;
      }

      .payment-history {
        margin-bottom: 30px;
      }

      .payment-history h3 {
        color: ${styling.colors.primary};
        font-size: ${styling.fontSizes.subheading}px;
        margin-bottom: 15px;
      }

      .payments-table {
        width: 100%;
        border-collapse: collapse;
        font-size: ${styling.fontSizes.small}px;
      }

      .payments-table thead {
        background: ${styling.colors.secondary};
        color: ${styling.colors.background};
      }

      .payments-table th,
      .payments-table td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid ${styling.colors.border};
      }

      .payments-table tr:nth-child(even) {
        background-color: #f9fafb;
      }

      .invoice-footer {
        text-align: center;
        padding-top: 20px;
        border-top: 1px solid ${styling.colors.border};
        font-size: ${styling.fontSizes.small}px;
        color: ${styling.colors.lightText};
      }

      .footer-text {
        margin-bottom: 10px;
      }

      .footer-links {
        margin-bottom: 10px;
      }

      .footer-links a {
        color: ${styling.colors.primary};
        text-decoration: none;
        margin: 0 10px;
      }

      .footer-links a:hover {
        text-decoration: underline;
      }

      .generation-time {
        margin: 0;
        font-size: ${styling.fontSizes.small - 1}px;
      }

      @media print {
        .invoice-container {
          padding: 20px;
        }
        
        .watermark {
          display: none;
        }
      }

      @media (max-width: 768px) {
        .invoice-container {
          padding: 20px;
        }
        
        .invoice-header,
        .bill-to-section {
          flex-direction: column;
          gap: 20px;
        }
        
        .business-info {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .invoice-info {
          text-align: left;
        }
        
        .totals-section {
          justify-content: flex-start;
        }
        
        .items-table,
        .payments-table {
          font-size: ${styling.fontSizes.small - 1}px;
        }
        
        .items-table th,
        .items-table td,
        .payments-table th,
        .payments-table td {
          padding: 6px 4px;
        }
      }
    `;
  }
}

// Export singleton instance
export const invoiceBrandingService = new InvoiceBrandingService();
export default invoiceBrandingService;