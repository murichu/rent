import axios from "axios";

// API Configuration
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract data from nested API response
 * Handles various response formats:
 * - response.data.data.properties (nested with key)
 * - response.data.properties (direct with key)
 * - response.data.data (nested array)
 * - response.data (direct array)
 */
export function extractResponseData(response, dataKey = null) {
  if (!response || !response.data) {
    return [];
  }

  const data = response.data;

  // Check nested structure with specific key (e.g., response.data.data.properties)
  if (dataKey && data.data && data.data[dataKey]) {
    return Array.isArray(data.data[dataKey]) ? data.data[dataKey] : [];
  }

  // Check top-level with specific key (e.g., response.data.properties)
  if (dataKey && data[dataKey]) {
    return Array.isArray(data[dataKey]) ? data[dataKey] : [];
  }

  // Check nested data (e.g., response.data.data)
  if (data.data) {
    return Array.isArray(data.data) ? data.data : [];
  }

  // Check direct data (e.g., response.data)
  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const correlationId = generateCorrelationId();
    config.headers["X-Correlation-ID"] = correlationId;
    config.metadata = { correlationId, startTime: Date.now() };

    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.id) {
      config.headers["X-User-ID"] = user.id;
    }

    if (import.meta.env.DEV) {
      console.log(`🚀 API Request [${correlationId}]:`, {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      console.log(
        `✅ API Response [${response.config.metadata.correlationId}]:`,
        {
          status: response.status,
          duration: `${duration}ms`,
          url: response.config.url,
        }
      );
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const correlationId = originalRequest?.metadata?.correlationId;

    if (import.meta.env.DEV) {
      console.error(`❌ API Error [${correlationId}]:`, {
        status: error.response?.status,
        message: error.message,
        url: originalRequest?.url,
      });
    }

    // Handle 401 errors
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

// Export the configured axios instance
export { apiClient };

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
};

export default API_ENDPOINTS;
