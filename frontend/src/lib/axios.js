import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

// Import toast service for error notifications
let toastService = null;
import('../services/toastService').then(module => {
  toastService = module.default;
});

/**
 * Error Classification and Retry Logic
 */
const ErrorTypes = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  AUTH: 'auth',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown'
};

const RetryableErrors = [
  ErrorTypes.NETWORK,
  ErrorTypes.TIMEOUT,
  ErrorTypes.SERVER
];

/**
 * Generate correlation ID for request tracking
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Classify error type
 */
function classifyError(error) {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return ErrorTypes.TIMEOUT;
    }
    return ErrorTypes.NETWORK;
  }

  const status = error.response.status;
  
  if (status === 401) return ErrorTypes.AUTH;
  if (status === 429) return ErrorTypes.RATE_LIMIT;
  if (status >= 500) return ErrorTypes.SERVER;
  if (status >= 400) return ErrorTypes.CLIENT;
  
  return ErrorTypes.UNKNOWN;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error) {
  const errorType = classifyError(error);
  return RetryableErrors.includes(errorType);
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(retryCount) {
  const baseDelay = 1000; // 1 second
  const maxDelay = 10000; // 10 seconds
  const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.1 * delay;
  return delay + jitter;
}

/**
 * Sleep function for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Create axios instance with enhanced config
const apiClient = axios.create({
  baseURL: API_ENDPOINTS.BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor with enhanced features
apiClient.interceptors.request.use(
  (config) => {
    // Add correlation ID for request tracking
    const correlationId = generateCorrelationId();
    config.headers['X-Correlation-ID'] = correlationId;
    config.metadata = { correlationId, startTime: Date.now() };

    // Add auth token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add user context if available
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.id) {
      config.headers['X-User-ID'] = user.id;
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request [${correlationId}]:`, {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL
      });
    }

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with comprehensive error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      console.log(`✅ API Response [${response.config.metadata.correlationId}]:`, {
        status: response.status,
        duration: `${duration}ms`,
        url: response.config.url
      });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const correlationId = originalRequest?.metadata?.correlationId;

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error [${correlationId}]:`, {
        status: error.response?.status,
        message: error.message,
        url: originalRequest?.url
      });
    }

    // Classify the error
    const errorType = classifyError(error);

    // Handle authentication errors
    if (errorType === ErrorTypes.AUTH) {
      handleAuthError(error);
      return Promise.reject(error);
    }

    // Handle rate limiting
    if (errorType === ErrorTypes.RATE_LIMIT) {
      handleRateLimitError(error);
      return Promise.reject(error);
    }

    // Implement retry logic for retryable errors
    if (isRetryableError(error) && shouldRetry(originalRequest)) {
      return handleRetry(originalRequest, error);
    }

    // Show user-friendly error notification
    showErrorNotification(error);

    return Promise.reject(error);
  }
);

/**
 * Handle authentication errors
 */
function handleAuthError(error) {
  const isTokenExpired = error.response?.data?.error?.includes('expired') ||
                        error.response?.data?.error?.includes('invalid');

  if (isTokenExpired) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      attemptTokenRefresh(refreshToken);
    } else {
      redirectToLogin('Session expired. Please log in again.');
    }
  } else {
    redirectToLogin('Authentication required.');
  }
}

/**
 * Attempt to refresh authentication token
 */
async function attemptTokenRefresh(refreshToken) {
  try {
    const response = await axios.post(`${API_ENDPOINTS.BASE_URL}/auth/refresh`, {
      refreshToken
    });

    const { token, refreshToken: newRefreshToken } = response.data;
    
    localStorage.setItem('token', token);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    }

    if (toastService) {
      toastService.info('Session refreshed successfully');
    }

    // Retry the original request
    window.location.reload();
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
    redirectToLogin('Session expired. Please log in again.');
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin(message) {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  if (toastService) {
    toastService.warning(message);
  }
  
  // Delay redirect to allow toast to show
  setTimeout(() => {
    window.location.href = '/login';
  }, 1000);
}

/**
 * Handle rate limiting errors
 */
function handleRateLimitError(error) {
  const retryAfter = error.response?.headers['retry-after'] || 
                    error.response?.data?.retryAfter || 60;

  if (toastService) {
    toastService.warning(
      `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
      {
        title: 'Rate Limited',
        duration: retryAfter * 1000,
        correlationId: error.config?.metadata?.correlationId
      }
    );
  }
}

/**
 * Check if request should be retried
 */
function shouldRetry(config) {
  // Don't retry if already retried too many times
  if (config.__retryCount >= 3) {
    return false;
  }

  // Don't retry certain methods
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Handle retry logic
 */
async function handleRetry(config, error) {
  config.__retryCount = config.__retryCount || 0;
  config.__retryCount++;

  const delay = calculateRetryDelay(config.__retryCount);
  
  if (toastService && config.__retryCount === 1) {
    toastService.info(
      `Request failed. Retrying in ${Math.round(delay / 1000)} seconds...`,
      {
        title: 'Retrying Request',
        duration: delay,
        correlationId: config.metadata?.correlationId
      }
    );
  }

  await sleep(delay);

  // Update correlation ID for retry
  const newCorrelationId = generateCorrelationId();
  config.headers['X-Correlation-ID'] = newCorrelationId;
  config.metadata.correlationId = newCorrelationId;
  config.metadata.startTime = Date.now();

  return apiClient(config);
}

/**
 * Show user-friendly error notification
 */
function showErrorNotification(error) {
  if (!toastService) return;

  const errorType = classifyError(error);
  
  // Don't show notifications for certain error types
  if ([ErrorTypes.AUTH, ErrorTypes.RATE_LIMIT].includes(errorType)) {
    return;
  }

  // Show appropriate error message
  toastService.showApiError(error, {
    onRetry: isRetryableError(error) ? () => {
      // Retry the original request
      const config = { ...error.config };
      delete config.__retryCount;
      return apiClient(config);
    } : undefined
  });
}

/**
 * Enhanced API methods with better error handling
 */
const enhancedApiClient = {
  ...apiClient,

  // GET with enhanced error handling
  async get(url, config = {}) {
    try {
      const response = await apiClient.get(url, config);
      return response;
    } catch (error) {
      this.handleMethodError('GET', url, error);
      throw error;
    }
  },

  // POST with enhanced error handling
  async post(url, data, config = {}) {
    try {
      const response = await apiClient.post(url, data, config);
      return response;
    } catch (error) {
      this.handleMethodError('POST', url, error);
      throw error;
    }
  },

  // PUT with enhanced error handling
  async put(url, data, config = {}) {
    try {
      const response = await apiClient.put(url, data, config);
      return response;
    } catch (error) {
      this.handleMethodError('PUT', url, error);
      throw error;
    }
  },

  // DELETE with enhanced error handling
  async delete(url, config = {}) {
    try {
      const response = await apiClient.delete(url, config);
      return response;
    } catch (error) {
      this.handleMethodError('DELETE', url, error);
      throw error;
    }
  },

  // Handle method-specific errors
  handleMethodError(method, url, error) {
    console.error(`${method} ${url} failed:`, error);
    
    // Log to local storage for debugging
    const errorLog = {
      method,
      url,
      error: error.message,
      status: error.response?.status,
      timestamp: new Date().toISOString(),
      correlationId: error.config?.metadata?.correlationId
    };

    try {
      const existingLogs = JSON.parse(localStorage.getItem('api_errors') || '[]');
      existingLogs.push(errorLog);
      localStorage.setItem('api_errors', JSON.stringify(existingLogs.slice(-50))); // Keep last 50 errors
    } catch (storageError) {
      console.warn('Failed to log error to localStorage:', storageError);
    }
  }
};

export default enhancedApiClient;
