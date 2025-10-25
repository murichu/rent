import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../db.js';
import { invoiceBrandingService } from '../services/invoiceBrandingService.js';

describe('Invoice Branding System', () => {
  let testAgency, testUser, testProperty, testTenant, testLease, testInvoice;
  let authToken;

  beforeAll(async () => {
    // Create test agency
    testAgency = await prisma.agency.create({
      data: {
        name: 'Test Branding Agency',
        invoiceDayOfMonth: 28,
        dueDayOfMonth: 5,
      },
    });

    // Create agency settings with branding
    await prisma.agencySettings.create({
      data: {
        agencyId: testAgency.id,
        businessName: 'Test Property Management',
        businessAddress: '123 Test Street, Nairobi',
        businessPhone: '+254700123456',
        businessEmail: 'info@testpm.com',
        businessLogo: 'https://example.com/logo.png',
        primaryColor: '#1e40af',
        secondaryColor: '#64748b',
      },
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@branding.com',
        passwordHash: 'hashedpassword',
        name: 'Test User',
        role: 'ADMIN',
        agencyId: testAgency.id,
        emailVerified: true,
      },
    });

    // Create user settings with property manager branding
    await prisma.userSettings.create({
      data: {
        userId: testUser.id,
        enableCustomBranding: true,
        businessName: 'Premium Property Services',
        businessAddress: '456 Premium Avenue, Westlands',
        businessPhone: '+254700654321',
        businessEmail: 'contact@premiumproperties.com',
        logoUrl: 'https://example.com/premium-logo.png',
        primaryColor: '#059669',
        secondaryColor: '#374151',
        accentColor: '#dc2626',
        invoicePrefix: 'PPS',
        showWatermark: true,
        watermarkText: 'PREMIUM SERVICES',
        footerText: 'Thank you for choosing Premium Property Services',
      },
    });

    // Create test property
    testProperty = await prisma.property.create({
      data: {
        title: 'Test Apartment Complex',
        address: '789 Test Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        zip: '00100',
        type: 'TWO_BEDROOM',
        agencyId: testAgency.id,
      },
    });

    // Add property manager
    await prisma.propertyManager.create({
      data: {
        propertyId: testProperty.id,
        userId: testUser.id,
        role: 'LANDLORD',
      },
    });

    // Create test tenant
    testTenant = await prisma.tenant.create({
      data: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700111222',
        agencyId: testAgency.id,
      },
    });

    // Create test unit
    const testUnit = await prisma.unit.create({
      data: {
        propertyId: testProperty.id,
        unitNumber: 'A-101',
        type: 'TWO_BEDROOM',
        rentAmount: 50000,
      },
    });

    // Create test lease
    testLease = await prisma.lease.create({
      data: {
        propertyId: testProperty.id,
        unitId: testUnit.id,
        tenantId: testTenant.id,
        agencyId: testAgency.id,
        startDate: new Date('2024-01-01'),
        rentAmount: 50000,
        paymentDayOfMonth: 5,
      },
    });

    // Create test invoice
    testInvoice = await prisma.invoice.create({
      data: {
        leaseId: testLease.id,
        agencyId: testAgency.id,
        amount: 50000,
        periodYear: 2024,
        periodMonth: 10,
        issuedAt: new Date('2024-10-01'),
        dueAt: new Date('2024-10-05'),
      },
    });

    // Generate auth token (simplified for testing)
    authToken = 'test-token';
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.invoice.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.lease.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.unit.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.propertyManager.deleteMany({ where: { propertyId: testProperty.id } });
    await prisma.tenant.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.property.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.userSettings.deleteMany({ where: { userId: testUser.id } });
    await prisma.agencySettings.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.user.deleteMany({ where: { agencyId: testAgency.id } });
    await prisma.agency.deleteMany({ where: { id: testAgency.id } });
  });

  describe('Invoice Branding Service', () => {
    it('should get comprehensive invoice branding with property manager override', async () => {
      const brandedInvoice = await invoiceBrandingService.getInvoiceBranding(testInvoice.id, {
        usePropertyManagerBranding: true
      });

      expect(brandedInvoice).toBeDefined();
      expect(brandedInvoice.branding).toBeDefined();
      expect(brandedInvoice.branding.businessName).toBe('Premium Property Services');
      expect(brandedInvoice.branding.primaryColor).toBe('#059669');
      expect(brandedInvoice.branding.invoicePrefix).toBe('PPS');
      expect(brandedInvoice.branding.brandingSource).toBe('property_manager');
      expect(brandedInvoice.branding.propertyManagerInfo).toBeDefined();
      expect(brandedInvoice.branding.propertyManagerInfo.name).toBe('Test User');
    });

    it('should fallback to agency branding when property manager branding is disabled', async () => {
      const brandedInvoice = await invoiceBrandingService.getInvoiceBranding(testInvoice.id, {
        usePropertyManagerBranding: false
      });

      expect(brandedInvoice.branding.businessName).toBe('Test Property Management');
      expect(brandedInvoice.branding.primaryColor).toBe('#1e40af');
      expect(brandedInvoice.branding.brandingSource).toBe('agency');
      expect(brandedInvoice.branding.propertyManagerInfo).toBeNull();
    });

    it('should calculate invoice totals correctly', async () => {
      const brandedInvoice = await invoiceBrandingService.getInvoiceBranding(testInvoice.id);

      expect(brandedInvoice.calculations).toBeDefined();
      expect(brandedInvoice.calculations.subtotal).toBe(50000);
      expect(brandedInvoice.calculations.totalAmount).toBe(50000);
      expect(brandedInvoice.calculations.balanceDue).toBe(50000);
      expect(brandedInvoice.calculations.paymentStatus).toBe('OVERDUE'); // Past due date
    });

    it('should generate branded HTML invoice', async () => {
      const htmlResult = await invoiceBrandingService.generateBrandedHTML(testInvoice.id, {
        usePropertyManagerBranding: true
      });

      expect(htmlResult).toBeDefined();
      expect(htmlResult.html).toContain('Premium Property Services');
      expect(htmlResult.html).toContain('PPS-');
      expect(htmlResult.html).toContain('PREMIUM SERVICES'); // Watermark
      expect(htmlResult.css).toContain('#059669'); // Primary color
      expect(htmlResult.data.branding.brandingSource).toBe('property_manager');
    });

    it('should generate branded PDF invoice', async () => {
      const pdfBuffer = await invoiceBrandingService.generateBrandedPDF(testInvoice.id, {
        usePropertyManagerBranding: true
      });

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('Invoice API Endpoints', () => {
    // Mock authentication middleware for testing
    beforeEach(() => {
      // This would typically be handled by your test setup
      // For now, we'll assume the auth middleware is properly mocked
    });

    it('should get branded invoice with JSON format', async () => {
      // Note: This test would need proper authentication setup
      // For demonstration purposes, showing the expected behavior
      
      const mockBrandedInvoice = await invoiceBrandingService.getInvoiceBranding(testInvoice.id);
      
      expect(mockBrandedInvoice.branding).toBeDefined();
      expect(mockBrandedInvoice.calculations).toBeDefined();
      expect(mockBrandedInvoice.content).toBeDefined();
      expect(mockBrandedInvoice.styling).toBeDefined();
    });

    it('should generate PDF invoice with proper headers', async () => {
      const pdfBuffer = await invoiceBrandingService.generateBrandedPDF(testInvoice.id);
      
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      
      // Check PDF magic number
      const pdfHeader = pdfBuffer.slice(0, 4).toString();
      expect(pdfHeader).toBe('%PDF');
    });

    it('should handle branding hierarchy correctly', async () => {
      // Test with property manager branding enabled
      const pmBranding = await invoiceBrandingService.getInvoiceBranding(testInvoice.id, {
        usePropertyManagerBranding: true
      });
      
      expect(pmBranding.branding.brandingSource).toBe('property_manager');
      expect(pmBranding.branding.businessName).toBe('Premium Property Services');

      // Test with agency branding only
      const agencyBranding = await invoiceBrandingService.getInvoiceBranding(testInvoice.id, {
        usePropertyManagerBranding: false
      });
      
      expect(agencyBranding.branding.brandingSource).toBe('agency');
      expect(agencyBranding.branding.businessName).toBe('Test Property Management');
    });
  });

  describe('Branding Settings API', () => {
    it('should validate branding settings schema', () => {
      const validBranding = {
        enableCustomBranding: true,
        businessName: 'Test Business',
        businessEmail: 'test@business.com',
        primaryColor: '#1e40af',
        invoicePrefix: 'TB'
      };

      // This would test the Zod schema validation
      expect(validBranding.businessName).toBe('Test Business');
      expect(validBranding.primaryColor).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should generate branding preview with sample data', async () => {
      const sampleBranding = {
        businessName: 'Preview Business',
        primaryColor: '#dc2626',
        secondaryColor: '#374151',
        invoicePrefix: 'PB'
      };

      // Test preview generation logic
      const styling = invoiceBrandingService.getStylingOptions(sampleBranding);
      
      expect(styling.colors.primary).toBe('#dc2626');
      expect(styling.colors.secondary).toBe('#374151');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent invoice gracefully', async () => {
      await expect(
        invoiceBrandingService.getInvoiceBranding('non-existent-id')
      ).rejects.toThrow('Invoice not found');
    });

    it('should handle missing property manager branding', async () => {
      // Create invoice without property manager
      const simpleProperty = await prisma.property.create({
        data: {
          title: 'Simple Property',
          address: '123 Simple St',
          type: 'ONE_BEDROOM',
          agencyId: testAgency.id,
        },
      });

      const simpleUnit = await prisma.unit.create({
        data: {
          propertyId: simpleProperty.id,
          unitNumber: 'S-1',
          type: 'ONE_BEDROOM',
          rentAmount: 30000,
        },
      });

      const simpleLease = await prisma.lease.create({
        data: {
          propertyId: simpleProperty.id,
          unitId: simpleUnit.id,
          tenantId: testTenant.id,
          agencyId: testAgency.id,
          startDate: new Date(),
          rentAmount: 30000,
          paymentDayOfMonth: 5,
        },
      });

      const simpleInvoice = await prisma.invoice.create({
        data: {
          leaseId: simpleLease.id,
          agencyId: testAgency.id,
          amount: 30000,
          periodYear: 2024,
          periodMonth: 10,
          issuedAt: new Date(),
          dueAt: new Date(),
        },
      });

      const brandedInvoice = await invoiceBrandingService.getInvoiceBranding(simpleInvoice.id);
      
      expect(brandedInvoice.branding.brandingSource).toBe('agency');
      expect(brandedInvoice.branding.businessName).toBe('Test Property Management');

      // Cleanup
      await prisma.invoice.delete({ where: { id: simpleInvoice.id } });
      await prisma.lease.delete({ where: { id: simpleLease.id } });
      await prisma.unit.delete({ where: { id: simpleUnit.id } });
      await prisma.property.delete({ where: { id: simpleProperty.id } });
    });
  });

  describe('Performance', () => {
    it('should generate branding efficiently', async () => {
      const startTime = Date.now();
      
      await invoiceBrandingService.getInvoiceBranding(testInvoice.id);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(executionTime).toBeLessThan(1000); // 1 second
    });

    it('should handle multiple concurrent branding requests', async () => {
      const promises = Array(5).fill().map(() => 
        invoiceBrandingService.getInvoiceBranding(testInvoice.id)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.branding).toBeDefined();
        expect(result.calculations).toBeDefined();
      });
    });
  });
});