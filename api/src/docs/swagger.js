/**
 * OpenAPI/Swagger Documentation Configuration
 */

export const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Haven Property Management API',
    version: '1.0.0',
    description: 'Comprehensive property management system API for Kenya',
    contact: {
      name: 'Haven Support',
      email: 'support@haven.co.ke',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://api.haven.co.ke/api/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Common schemas
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'HTTP_400',
              },
              details: {
                type: 'object',
              },
            },
          },
        },
      },
      
      Success: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
            example: 'Success',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
          },
          data: {
            type: 'object',
          },
        },
      },
      
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            example: 1,
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            example: 10,
          },
          total: {
            type: 'integer',
            minimum: 0,
            example: 50,
          },
          pages: {
            type: 'integer',
            minimum: 0,
            example: 5,
          },
          hasNext: {
            type: 'boolean',
            example: true,
          },
          hasPrev: {
            type: 'boolean',
            example: false,
          },
        },
      },
      
      // Property schemas
      Property: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          title: {
            type: 'string',
            example: 'Modern 2BR Apartment in Westlands',
          },
          address: {
            type: 'string',
            example: '123 Waiyaki Way, Westlands',
          },
          city: {
            type: 'string',
            example: 'Nairobi',
          },
          state: {
            type: 'string',
            example: 'Nairobi County',
          },
          zip: {
            type: 'string',
            example: '00100',
          },
          bedrooms: {
            type: 'integer',
            minimum: 0,
            example: 2,
          },
          bathrooms: {
            type: 'number',
            minimum: 0,
            example: 2.5,
          },
          sizeSqFt: {
            type: 'integer',
            minimum: 1,
            example: 1200,
          },
          rentAmount: {
            type: 'integer',
            minimum: 1,
            example: 75000,
            description: 'Rent amount in Kenyan Shillings (cents)',
          },
          status: {
            type: 'string',
            enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET'],
            example: 'AVAILABLE',
          },
          type: {
            type: 'string',
            enum: [
              'SINGLE_ROOM', 'DOUBLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM',
              'TWO_BEDROOM', 'THREE_BEDROOM', 'FOUR_BEDROOM', 'MAISONETTE',
              'BUNGALOW', 'SERVANT_QUARTER', 'PENTHOUSE', 'TOWNHOUSE',
              'VILLA', 'COMMERCIAL', 'OFFICE'
            ],
            example: 'TWO_BEDROOM',
          },
          agencyId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['title', 'address', 'type'],
      },
      
      PropertyCreate: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            example: 'Modern 2BR Apartment in Westlands',
          },
          address: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
            example: '123 Waiyaki Way, Westlands',
          },
          city: {
            type: 'string',
            maxLength: 100,
            example: 'Nairobi',
          },
          state: {
            type: 'string',
            maxLength: 100,
            example: 'Nairobi County',
          },
          zip: {
            type: 'string',
            maxLength: 20,
            example: '00100',
          },
          bedrooms: {
            type: 'integer',
            minimum: 0,
            maximum: 20,
            example: 2,
          },
          bathrooms: {
            type: 'number',
            minimum: 0,
            maximum: 20,
            example: 2.5,
          },
          sizeSqFt: {
            type: 'integer',
            minimum: 1,
            example: 1200,
          },
          rentAmount: {
            type: 'integer',
            minimum: 1,
            example: 75000,
          },
          type: {
            type: 'string',
            enum: [
              'SINGLE_ROOM', 'DOUBLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM',
              'TWO_BEDROOM', 'THREE_BEDROOM', 'FOUR_BEDROOM', 'MAISONETTE',
              'BUNGALOW', 'SERVANT_QUARTER', 'PENTHOUSE', 'TOWNHOUSE',
              'VILLA', 'COMMERCIAL', 'OFFICE'
            ],
            example: 'TWO_BEDROOM',
          },
          status: {
            type: 'string',
            enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET'],
            example: 'AVAILABLE',
          },
        },
        required: ['title', 'address', 'type'],
      },
      
      // Tenant schemas
      Tenant: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '507f1f77bcf86cd799439013',
          },
          name: {
            type: 'string',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'john.doe@example.com',
          },
          phone: {
            type: 'string',
            example: '254700123456',
          },
          averageRating: {
            type: 'number',
            minimum: 0,
            maximum: 5,
            example: 4.2,
          },
          isHighRisk: {
            type: 'boolean',
            example: false,
          },
          agencyId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['name'],
      },
      
      // Payment schemas
      Payment: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '507f1f77bcf86cd799439014',
          },
          leaseId: {
            type: 'string',
            example: '507f1f77bcf86cd799439015',
          },
          amount: {
            type: 'integer',
            minimum: 1,
            example: 75000,
            description: 'Payment amount in Kenyan Shillings (cents)',
          },
          paidAt: {
            type: 'string',
            format: 'date-time',
          },
          method: {
            type: 'string',
            enum: ['MPESA_C2B', 'MANUAL'],
            example: 'MPESA_C2B',
          },
          referenceNumber: {
            type: 'string',
            example: 'QHX123ABC',
          },
          notes: {
            type: 'string',
            example: 'Monthly rent payment',
          },
          agencyId: {
            type: 'string',
            example: '507f1f77bcf86cd799439012',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['leaseId', 'amount'],
      },
      
      // M-Pesa schemas
      MpesaStkPush: {
        type: 'object',
        properties: {
          phoneNumber: {
            type: 'string',
            pattern: '^254[17]\\d{8}$',
            example: '254700123456',
          },
          amount: {
            type: 'integer',
            minimum: 1,
            example: 75000,
          },
          accountReference: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            example: 'RENT-001',
          },
          transactionDesc: {
            type: 'string',
            maxLength: 100,
            example: 'Monthly rent payment',
          },
          leaseId: {
            type: 'string',
            example: '507f1f77bcf86cd799439015',
          },
        },
        required: ['phoneNumber', 'amount', 'accountReference'],
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization',
    },
    {
      name: 'Properties',
      description: 'Property management operations',
    },
    {
      name: 'Tenants',
      description: 'Tenant management operations',
    },
    {
      name: 'Leases',
      description: 'Lease management operations',
    },
    {
      name: 'Payments',
      description: 'Payment processing and tracking',
    },
    {
      name: 'M-Pesa',
      description: 'M-Pesa payment integration',
    },
    {
      name: 'Dashboard',
      description: 'Dashboard analytics and statistics',
    },
    {
      name: 'Health',
      description: 'System health and monitoring',
    },
  ],
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.js',
    './src/docs/paths/*.js',
  ],
};