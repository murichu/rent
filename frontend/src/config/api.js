// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

// API Endpoints
export const API_ENDPOINTS = {
  // Base
  BASE_URL: API_BASE_URL,

  // Authentication
  AUTH: {
    LOGIN: `/auth/login`,
    REGISTER: `/auth/register`,
    LOGOUT: `/auth/logout`,
    REFRESH: `/auth/refresh`,
    VERIFY_EMAIL: `/auth/verify-email`,
    FORGOT_PASSWORD: `/auth/forgot-password`,
    RESET_PASSWORD: `/auth/reset-password`,
  },

  // Users
  USERS: {
    BASE: `/users`,
    BY_ID: (id) => `/users/${id}`,
    ME: `/users/me`,
  },

  // Agencies
  AGENCIES: {
    BASE: `/agencies`,
    BY_ID: (id) => `/agencies/${id}`,
  },

  // Properties
  PROPERTIES: {
    BASE: `/properties`,
    BY_ID: (id) => `/properties/${id}`,
  },

  // Units
  UNITS: {
    BASE: `/units`,
    BY_ID: (id) => `/units/${id}`,
    BY_PROPERTY: (propertyId) => `/units?propertyId=${propertyId}`,
  },

  // Tenants
  TENANTS: {
    BASE: `/tenants`,
    BY_ID: (id) => `/tenants/${id}`,
  },

  // Leases
  LEASES: {
    BASE: `/leases`,
    BY_ID: (id) => `/leases/${id}`,
    BY_TENANT: (tenantId) => `/leases?tenantId=${tenantId}`,
    BY_PROPERTY: (propertyId) => `/leases?propertyId=${propertyId}`,
  },

  // Invoices
  INVOICES: {
    BASE: `/invoices`,
    BY_ID: (id) => `/invoices/${id}`,
    BY_LEASE: (leaseId) => `/invoices?leaseId=${leaseId}`,
  },

  // Payments
  PAYMENTS: {
    BASE: `/payments`,
    BY_ID: (id) => `/payments/${id}`,
    BY_LEASE: (leaseId) => `/payments?leaseId=${leaseId}`,
  },

  // M-Pesa
  MPESA: {
    BASE: `/mpesa`,
    STK_PUSH: `/mpesa/stk-push`,
    TRANSACTIONS: `/mpesa/transactions`,
    CALLBACK: `/mpesa/callback`,
    BALANCE: `/mpesa/balance/latest`,
  },

  // PesaPal
  PESAPAL: {
    BASE: `/pesapal`,
    INITIATE: `/pesapal/initiate`,
    TRANSACTIONS: `/pesapal/transactions`,
    CALLBACK: `/pesapal/callback`,
  },

  // KCB
  KCB: {
    BASE: `/kcb`,
    PAYMENT: `/kcb/payment`,
    TRANSACTIONS: `/kcb/transactions`,
  },

  // Agents
  AGENTS: {
    BASE: `/agents`,
    BY_ID: (id) => `/agents/${id}`,
  },

  // Caretakers
  CARETAKERS: {
    BASE: `/caretakers`,
    BY_ID: (id) => `/caretakers/${id}`,
  },

  // Notices
  NOTICES: {
    BASE: `/notices`,
    BY_ID: (id) => `/notices/${id}`,
    SEND: (id) => `/notices/${id}/send`,
  },

  // Penalties
  PENALTIES: {
    BASE: `/penalties`,
    BY_ID: (id) => `/penalties/${id}`,
    WAIVE: (id) => `/penalties/${id}/waive`,
    PAY: (id) => `/penalties/${id}/pay`,
  },

  // Messages
  MESSAGES: {
    BASE: `/messages`,
    BY_ID: (id) => `/messages/${id}`,
    SEND: `/messages/send`,
  },

  // Reports
  REPORTS: {
    BASE: `/reports`,
    REVENUE: `/reports/revenue`,
    OCCUPANCY: `/reports/occupancy`,
    PAYMENTS: `/reports/payments`,
  },

  // Dashboard
  DASHBOARD: {
    STATS: `/dashboard/stats`,
    RECENT_ACTIVITY: `/dashboard/recent-activity`,
  },

  // Settings
  SETTINGS: {
    BASE: `/settings`,
    PROFILE: `/settings/profile`,
    PASSWORD: `/settings/password`,
    NOTIFICATIONS: `/settings/notifications`,
  },

  // 2FA
  TWO_FA: {
    SETUP: `/2fa/setup`,
    VERIFY: `/2fa/verify`,
    DISABLE: `/2fa/disable`,
  },

  // Uploads
  UPLOADS: {
    BASE: `/uploads`,
    IMAGE: `/uploads/image`,
    DOCUMENT: `/uploads/document`,
  },

  // Exports
  EXPORTS: {
    BASE: `/exports`,
    PROPERTIES: `/exports/properties`,
    TENANTS: `/exports/tenants`,
    PAYMENTS: `/exports/payments`,
  },

  // Health
  HEALTH: `http://localhost:4000/health`,
}

export default API_ENDPOINTS
