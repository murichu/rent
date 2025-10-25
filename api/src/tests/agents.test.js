import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../db.js';
import jwt from 'jsonwebtoken';

// Mock the database
vi.mock('../db.js', () => ({
  prisma: {
    agent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    agentLease: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
    },
    agentCommissionPayment: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    property: {
      findMany: vi.fn(),
    },
    lease: {
      findMany: vi.fn(),
    },
  },
}));

describe('Agent Management API', () => {
  let authToken;
  let agentToken;
  const mockAgencyId = 'agency-123';
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';

  beforeEach(() => {
    // Create mock tokens
    authToken = jwt.sign(
      { userId: mockUserId, agencyId: mockAgencyId, role: 'ADMIN' },
      process.env.JWT_SECRET || 'dev-secret'
    );
    
    agentToken = jwt.sign(
      { agentId: mockAgentId, agencyId: mockAgencyId, userType: 'agent' },
      process.env.JWT_SECRET || 'dev-secret'
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /agents', () => {
    it('should return paginated list of agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'John Doe',
          phone: '+254700000001',
          email: 'john@example.com',
          commissionRate: 10,
          agencyId: mockAgencyId,
          leases: [],
          settings: null,
        },
        {
          id: 'agent-2',
          name: 'Jane Smith',
          phone: '+254700000002',
          email: 'jane@example.com',
          commissionRate: 15,
          agencyId: mockAgencyId,
          leases: [],
          settings: null,
        },
      ];

      prisma.agent.findMany.mockResolvedValue(mockAgents);
      prisma.agent.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.agents).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter agents by search query', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'John Doe',
          phone: '+254700000001',
          email: 'john@example.com',
          commissionRate: 10,
          agencyId: mockAgencyId,
          leases: [],
          settings: null,
        },
      ];

      prisma.agent.findMany.mockResolvedValue(mockAgents);
      prisma.agent.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/agents?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'John', mode: 'insensitive' } },
              { phone: { contains: 'John' } },
              { email: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/agents')
        .expect(401);
    });
  });

  describe('GET /agents/:id', () => {
    it('should return specific agent details', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'John Doe',
        phone: '+254700000001',
        email: 'john@example.com',
        commissionRate: 10,
        agencyId: mockAgencyId,
        leases: [],
        settings: null,
      };

      prisma.agent.findFirst.mockResolvedValue(mockAgent);

      const response = await request(app)
        .get('/api/agents/agent-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(mockAgent);
    });

    it('should return 404 for non-existent agent', async () => {
      prisma.agent.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/agents/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /agents', () => {
    it('should create new agent with valid data', async () => {
      const newAgentData = {
        name: 'New Agent',
        phone: '+254700000003',
        email: 'newagent@example.com',
        commissionRate: 12,
      };

      const mockCreatedAgent = {
        id: 'agent-new',
        ...newAgentData,
        agencyId: mockAgencyId,
        settings: null,
      };

      prisma.agent.findFirst.mockResolvedValue(null); // No existing agent
      prisma.agent.create.mockResolvedValue(mockCreatedAgent);

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAgentData)
        .expect(201);

      expect(response.body).toEqual(mockCreatedAgent);
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: {
          ...newAgentData,
          agencyId: mockAgencyId,
        },
        include: {
          settings: true,
        },
      });
    });

    it('should reject duplicate phone number', async () => {
      const newAgentData = {
        name: 'New Agent',
        phone: '+254700000001', // Existing phone
        email: 'newagent@example.com',
        commissionRate: 12,
      };

      prisma.agent.findFirst.mockResolvedValue({ id: 'existing-agent' });

      await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAgentData)
        .expect(409);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'A', // Too short
        phone: '123', // Too short
        commissionRate: 150, // Too high
      };

      await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PUT /agents/:id', () => {
    it('should update agent with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        commissionRate: 15,
      };

      const existingAgent = {
        id: 'agent-1',
        name: 'Old Name',
        phone: '+254700000001',
        email: 'agent@example.com',
        commissionRate: 10,
        agencyId: mockAgencyId,
      };

      const updatedAgent = {
        ...existingAgent,
        ...updateData,
        leases: [],
        settings: null,
      };

      prisma.agent.findFirst.mockResolvedValue(existingAgent);
      prisma.agent.update.mockResolvedValue(updatedAgent);

      const response = await request(app)
        .put('/api/agents/agent-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(updatedAgent);
    });

    it('should return 404 for non-existent agent', async () => {
      prisma.agent.findFirst.mockResolvedValue(null);

      await request(app)
        .put('/api/agents/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);
    });
  });

  describe('DELETE /agents/:id', () => {
    it('should delete agent without active leases', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Agent to Delete',
        agencyId: mockAgencyId,
        leases: [], // No active leases
      };

      prisma.agent.findFirst.mockResolvedValue(mockAgent);
      prisma.agent.delete.mockResolvedValue(mockAgent);

      const response = await request(app)
        .delete('/api/agents/agent-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Agent deleted successfully');
    });

    it('should not delete agent with active leases', async () => {
      const mockAgent = {
        id: 'agent-1',
        name: 'Agent with Leases',
        agencyId: mockAgencyId,
        leases: [{ id: 'lease-1' }], // Has active leases
      };

      prisma.agent.findFirst.mockResolvedValue(mockAgent);

      await request(app)
        .delete('/api/agents/agent-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /agents/:id/assign-properties', () => {
    it('should assign properties to agent', async () => {
      const propertyIds = ['prop-1', 'prop-2'];
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        agencyId: mockAgencyId,
        commissionRate: 10,
      };

      const mockProperties = [
        { id: 'prop-1', agencyId: mockAgencyId },
        { id: 'prop-2', agencyId: mockAgencyId },
      ];

      const mockLeases = [
        { id: 'lease-1', propertyId: 'prop-1', rentAmount: 50000, agencyId: mockAgencyId },
        { id: 'lease-2', propertyId: 'prop-2', rentAmount: 60000, agencyId: mockAgencyId },
      ];

      const updatedAgent = {
        ...mockAgent,
        leases: [
          {
            lease: {
              ...mockLeases[0],
              property: { title: 'Property 1' },
              unit: { unitNumber: 'A1' },
              tenant: { name: 'Tenant 1' },
            },
          },
        ],
      };

      prisma.agent.findFirst.mockResolvedValue(mockAgent);
      prisma.property.findMany.mockResolvedValue(mockProperties);
      prisma.lease.findMany.mockResolvedValue(mockLeases);
      prisma.agentLease.deleteMany.mockResolvedValue({ count: 0 });
      prisma.agentLease.createMany.mockResolvedValue({ count: 2 });
      prisma.agent.findUnique.mockResolvedValue(updatedAgent);

      const response = await request(app)
        .post('/api/agents/agent-1/assign-properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ propertyIds })
        .expect(200);

      expect(response.body.message).toContain('Successfully assigned');
      expect(response.body.assignedLeases).toBe(2);
    });

    it('should validate property ownership', async () => {
      const propertyIds = ['prop-1', 'prop-2'];
      const mockAgent = {
        id: 'agent-1',
        name: 'Test Agent',
        agencyId: mockAgencyId,
      };

      // Return fewer properties than requested (some don't belong to agency)
      const mockProperties = [
        { id: 'prop-1', agencyId: mockAgencyId },
      ];

      prisma.agent.findFirst.mockResolvedValue(mockAgent);
      prisma.property.findMany.mockResolvedValue(mockProperties);

      await request(app)
        .post('/api/agents/agent-1/assign-properties')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ propertyIds })
        .expect(400);
    });
  });

  describe('GET /agents/:id/commissions', () => {
    it('should return agent commission history', async () => {
      const mockCommissions = [
        {
          id: 'comm-1',
          agentId: 'agent-1',
          commission: 5000,
          paid: false,
          lease: {
            property: { title: 'Property 1', address: '123 Main St' },
            unit: { unitNumber: 'A1' },
            tenant: { name: 'John Tenant', phone: '+254700000001' },
          },
        },
      ];

      const mockSummary = {
        totalEarned: { _sum: { commission: 10000 } },
        totalPending: { _sum: { commission: 5000 } },
      };

      prisma.agent.findFirst.mockResolvedValue({ id: 'agent-1', agencyId: mockAgencyId });
      prisma.agentLease.findMany.mockResolvedValue(mockCommissions);
      prisma.agentLease.count.mockResolvedValue(1);
      prisma.agentLease.aggregate
        .mockResolvedValueOnce(mockSummary.totalEarned)
        .mockResolvedValueOnce(mockSummary.totalPending);

      const response = await request(app)
        .get('/api/agents/agent-1/commissions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('commissions');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary.totalEarned).toBe(10000);
      expect(response.body.summary.totalPending).toBe(5000);
    });
  });

  describe('Agent Commission Payments', () => {
    describe('GET /agents/:id/commission-payments', () => {
      it('should return commission payment history', async () => {
        const mockPayments = [
          {
            id: 'payment-1',
            agentId: 'agent-1',
            amount: 5000,
            paymentDate: new Date(),
            paymentPeriod: '2024-01',
            status: 'COMPLETED',
            agent: { name: 'Test Agent', phone: '+254700000001' },
          },
        ];

        prisma.agent.findFirst.mockResolvedValue({ id: 'agent-1', agencyId: mockAgencyId });
        prisma.agentCommissionPayment.findMany.mockResolvedValue(mockPayments);
        prisma.agentCommissionPayment.count.mockResolvedValue(1);

        const response = await request(app)
          .get('/api/agents/agent-1/commission-payments')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('payments');
        expect(response.body.payments).toHaveLength(1);
      });
    });

    describe('POST /agents/:id/commission-payments', () => {
      it('should create commission payment', async () => {
        const paymentData = {
          amount: 5000,
          paymentPeriod: '2024-01',
          rentCollected: 50000,
          commissionRate: 10,
          method: 'MANUAL',
          description: 'January commission',
        };

        const mockAgent = { id: 'agent-1', agencyId: mockAgencyId, commissionRate: 10 };
        const mockPayment = {
          id: 'payment-1',
          ...paymentData,
          agentId: 'agent-1',
          agencyId: mockAgencyId,
          agent: { name: 'Test Agent', phone: '+254700000001' },
        };

        prisma.agent.findFirst.mockResolvedValue(mockAgent);
        prisma.agentCommissionPayment.findFirst.mockResolvedValue(null); // No existing payment
        prisma.agentCommissionPayment.create.mockResolvedValue(mockPayment);

        const response = await request(app)
          .post('/api/agents/agent-1/commission-payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(201);

        expect(response.body.message).toBe('Commission payment created successfully');
        expect(response.body.payment).toEqual(mockPayment);
      });

      it('should prevent duplicate payments for same period', async () => {
        const paymentData = {
          amount: 5000,
          paymentPeriod: '2024-01',
        };

        const mockAgent = { id: 'agent-1', agencyId: mockAgencyId };
        const existingPayment = { id: 'existing-payment' };

        prisma.agent.findFirst.mockResolvedValue(mockAgent);
        prisma.agentCommissionPayment.findFirst.mockResolvedValue(existingPayment);

        await request(app)
          .post('/api/agents/agent-1/commission-payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(400);
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('POST /agents/bulk-commission-payments', () => {
      it('should process bulk commission payments', async () => {
        const paymentPeriod = '2024-01';
        const mockResults = {
          totalProcessed: 3,
          successful: 3,
          failed: 0,
          details: [
            { agentId: 'agent-1', status: 'success', amount: 5000 },
            { agentId: 'agent-2', status: 'success', amount: 7500 },
            { agentId: 'agent-3', status: 'success', amount: 6000 },
          ],
        };

        // Mock the commission calculation service
        vi.doMock('../services/commissionCalculation.js', () => ({
          validatePaymentPeriod: vi.fn(),
          bulkProcessAgentCommissions: vi.fn().mockResolvedValue(mockResults),
        }));

        const response = await request(app)
          .post('/api/agents/bulk-commission-payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ paymentPeriod })
          .expect(200);

        expect(response.body.message).toContain('3 agents processed successfully');
        expect(response.body.results).toEqual(mockResults);
      });

      it('should validate payment period format', async () => {
        await request(app)
          .post('/api/agents/bulk-commission-payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ paymentPeriod: 'invalid-format' })
          .expect(400);
      });
    });
  });
});