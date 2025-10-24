import { z } from 'zod';
import logger from '../utils/logger.js';

/**
 * Enhanced validation middleware using Zod
 * Provides comprehensive input validation with detailed error messages
 */

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format'),
  
  // Email validation
  email: z.string().email('Invalid email format').toLowerCase(),
  
  // Phone number validation (Kenya format)
  phoneNumber: z.string()
    .regex(/^(\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number format')
    .transform(phone => {
      // Normalize to international format
      if (phone.startsWith('0')) return `254${phone.slice(1)}`;
      if (phone.startsWith('254')) return phone;
      if (phone.startsWith('+254')) return phone.slice(1);
      return `254${phone}`;
    }),
  
  // Pagination
  pagination: z.object({
    page: z.string().transform(Number).pipe(z.number().int().min(1)).default('1'),
    limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('10'),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
  
  // Date range
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, 'Start date must be before end date'),
  
  // Amount validation (in cents)
  amount: z.number().int().min(1, 'Amount must be greater than 0'),
  
  // Status filters
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'COMPLETED', 'CANCELLED']).optional(),
};

// Property validation schemas
export const propertySchemas = {
  create: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    address: z.string().min(1, 'Address is required').max(500, 'Address too long'),
    city: z.string().min(1, 'City is required').max(100, 'City name too long').optional(),
    state: z.string().max(100, 'State name too long').optional(),
    zip: z.string().max(20, 'ZIP code too long').optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().min(0).max(20).optional(),
    sizeSqFt: z.number().int().min(1).optional(),
    rentAmount: z.number().int().min(1, 'Rent amount must be greater than 0').optional(),
    type: z.enum([
      'SINGLE_ROOM', 'DOUBLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM', 'TWO_BEDROOM',
      'THREE_BEDROOM', 'FOUR_BEDROOM', 'MAISONETTE', 'BUNGALOW', 'SERVANT_QUARTER',
      'PENTHOUSE', 'TOWNHOUSE', 'VILLA', 'COMMERCIAL', 'OFFICE'
    ]),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET']).default('AVAILABLE'),
  }),
  
  update: z.object({
    title: z.string().min(1).max(200).optional(),
    address: z.string().min(1).max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zip: z.string().max(20).optional(),
    bedrooms: z.number().int().min(0).max(20).optional(),
    bathrooms: z.number().min(0).max(20).optional(),
    sizeSqFt: z.number().int().min(1).optional(),
    rentAmount: z.number().int().min(1).optional(),
    type: z.enum([
      'SINGLE_ROOM', 'DOUBLE_ROOM', 'BEDSITTER', 'ONE_BEDROOM', 'TWO_BEDROOM',
      'THREE_BEDROOM', 'FOUR_BEDROOM', 'MAISONETTE', 'BUNGALOW', 'SERVANT_QUARTER',
      'PENTHOUSE', 'TOWNHOUSE', 'VILLA', 'COMMERCIAL', 'OFFICE'
    ]).optional(),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET']).optional(),
  }),
  
  query: z.object({
    ...commonSchemas.pagination.shape,
    city: z.string().optional(),
    type: z.string().optional(),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OFF_MARKET']).optional(),
    minRent: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
    maxRent: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
    bedrooms: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
    search: z.string().max(100).optional(),
  }),
};

// Tenant validation schemas
export const tenantSchemas = {
  create: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phoneNumber.optional(),
  }).refine(data => data.email || data.phone, 'Either email or phone is required'),
  
  update: z.object({
    name: z.string().min(1).max(100).optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phoneNumber.optional(),
  }),
  
  query: commonSchemas.pagination.extend({
    search: z.string().max(100).optional(),
    isHighRisk: z.string().transform(val => val === 'true').optional(),
  }),
};

// Lease validation schemas
export const leaseSchemas = {
  create: z.object({
    propertyId: commonSchemas.objectId.optional(),
    unitId: commonSchemas.objectId.optional(),
    tenantId: commonSchemas.objectId,
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    rentAmount: commonSchemas.amount,
    paymentDayOfMonth: z.number().int().min(1).max(31),
  }).refine(data => data.propertyId || data.unitId, 'Either propertyId or unitId is required')
    .refine(data => {
      if (data.endDate) {
        return new Date(data.startDate) < new Date(data.endDate);
      }
      return true;
    }, 'Start date must be before end date'),
  
  update: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    rentAmount: commonSchemas.amount.optional(),
    paymentDayOfMonth: z.number().int().min(1).max(31).optional(),
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true;
  }, 'Start date must be before end date'),
  
  query: commonSchemas.pagination.extend({
    propertyId: commonSchemas.objectId.optional(),
    tenantId: commonSchemas.objectId.optional(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
    ...commonSchemas.dateRange.shape,
  }),
};

// Payment validation schemas
export const paymentSchemas = {
  create: z.object({
    leaseId: commonSchemas.objectId,
    amount: commonSchemas.amount,
    paidAt: z.string().datetime().optional(),
    method: z.enum(['MPESA_C2B', 'MANUAL']).default('MANUAL'),
    referenceNumber: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    invoiceId: commonSchemas.objectId.optional(),
  }),
  
  query: commonSchemas.pagination.extend({
    leaseId: commonSchemas.objectId.optional(),
    method: z.enum(['MPESA_C2B', 'MANUAL']).optional(),
    ...commonSchemas.dateRange.shape,
    minAmount: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
    maxAmount: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
  }),
};

// M-Pesa validation schemas
export const mpesaSchemas = {
  stkPush: z.object({
    phoneNumber: commonSchemas.phoneNumber,
    amount: commonSchemas.amount,
    accountReference: z.string().min(1).max(50),
    transactionDesc: z.string().max(100).optional(),
    leaseId: commonSchemas.objectId.optional(),
  }),
  
  callback: z.object({
    Body: z.object({
      stkCallback: z.object({
        MerchantRequestID: z.string(),
        CheckoutRequestID: z.string(),
        ResultCode: z.number(),
        ResultDesc: z.string(),
        CallbackMetadata: z.object({
          Item: z.array(z.object({
            Name: z.string(),
            Value: z.union([z.string(), z.number()]).optional(),
          }))
        }).optional(),
      })
    })
  }),
};

// Auth validation schemas
export const authSchemas = {
  register: z.object({
    email: commonSchemas.email,
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    agencyName: z.string().min(1, 'Agency name is required').max(100, 'Agency name too long'),
  }),
  
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),
  
  resetPassword: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  }),
  
  requestReset: z.object({
    email: commonSchemas.email,
  }),
};

/**
 * Create validation middleware for request validation
 * @param {Object} schemas - Object containing validation schemas for body, query, params
 * @returns {Function} Express middleware function
 */
export function validateRequest(schemas = {}) {
  return (req, res, next) => {
    const errors = {};
    
    try {
      // Validate request body
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          errors.body = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.received,
          }));
        } else {
          req.body = result.data;
        }
      }
      
      // Validate query parameters
      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          errors.query = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.received,
          }));
        } else {
          req.query = result.data;
        }
      }
      
      // Validate route parameters
      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          errors.params = result.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
            received: err.received,
          }));
        } else {
          req.params = result.data;
        }
      }
      
      // If there are validation errors, return them
      if (Object.keys(errors).length > 0) {
        logger.warn('Request validation failed', {
          url: req.url,
          method: req.method,
          errors,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
        
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
      
      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal validation error',
      });
    }
  };
}

/**
 * Validate ObjectId parameter
 */
export function validateObjectId(paramName = 'id') {
  return validateRequest({
    params: z.object({
      [paramName]: commonSchemas.objectId,
    }),
  });
}

/**
 * Validate pagination query parameters
 */
export function validatePagination() {
  return validateRequest({
    query: commonSchemas.pagination,
  });
}

/**
 * Sanitize and validate file upload
 */
export function validateFileUpload(options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    required = false,
  } = options;
  
  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        error: 'File is required',
      });
    }
    
    if (req.file) {
      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
        });
      }
      
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }
      
      // Sanitize filename
      req.file.originalname = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    }
    
    next();
  };
}

export default {
  validateRequest,
  validateObjectId,
  validatePagination,
  validateFileUpload,
  commonSchemas,
  propertySchemas,
  tenantSchemas,
  leaseSchemas,
  paymentSchemas,
  mpesaSchemas,
  authSchemas,
};