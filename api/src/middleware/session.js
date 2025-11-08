import logger from "../utils/logger.js";
import MemorySessionManager from "../services/memorySessionManager.js";
import redisClient from "../config/redis.js";

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  ttl: parseInt(process.env.SESSION_TTL) || 24 * 60 * 60, // 24 hours in seconds
  cookieName: process.env.SESSION_COOKIE_NAME || "haven_session",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "strict",
};

/**
 * Session Manager Class
 * Handles session management using Redis Cloud with memory fallback
 */
class SessionManager {
  constructor() {
    this.redis = null;
    this.memoryManager = null;
    this.config = SESSION_CONFIG;
    this.isReady = false;
    this.useMemoryFallback = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._initialize().catch((error) => {
      logger.error("Session manager initialization failed:", error);
      // Always return true to prevent crashes
      return true;
    });

    return this.initPromise;
  }

  async _initialize() {
    try {
      logger.info("Starting session manager initialization...");

      // Try to connect to Redis Cloud
      if (process.env.DISABLE_REDIS !== 'true') {
        try {
          this.redis = await redisClient.connect();
          
          if (this.redis && redisClient.isReady()) {
            logger.info("✅ Using Redis Cloud for session management");
            this.useMemoryFallback = false;
            this.isReady = true;
            return true;
          }
        } catch (redisError) {
          logger.warn("Redis connection failed, falling back to memory:", redisError.message);
        }
      } else {
        logger.info("Redis disabled via DISABLE_REDIS flag");
      }

      // Fallback to memory sessions
      logger.info("Using memory-only session management");
      this.memoryManager = new MemorySessionManager();
      this.useMemoryFallback = true;
      this.isReady = true;

      logger.info("✅ Session manager initialized successfully (memory fallback)");
      return true;
    } catch (error) {
      logger.error("❌ Failed to initialize session manager:", {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });

      // Always fall back to memory sessions
      logger.warn("Falling back to basic memory session manager");
      this.memoryManager = new MemorySessionManager();
      this.useMemoryFallback = true;
      this.isReady = true;
      return true;
    }
  }

  async ensureConnection() {
    if (!this.isReady) await this.initialize();
    return this.useMemoryFallback ? this.memoryManager : this.redis;
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  async createSession(userId, userData = {}) {
    const sessionId = this.generateSessionId();
    const sessionData = {
      userId,
      ...userData,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
    };

    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.createSession(userId, userData);
    }

    // Use Redis
    try {
      const key = `session:${sessionId}`;
      await this.redis.setEx(key, this.config.ttl, JSON.stringify(sessionData));
      logger.info("Session created in Redis", { sessionId, userId });
      return { sessionId, sessionData };
    } catch (error) {
      logger.error("Failed to create session in Redis:", error);
      // Fallback to basic session
      return { sessionId, sessionData };
    }
  }

  async getSession(sessionId) {
    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.getSession(sessionId);
    }

    // Use Redis
    try {
      const key = `session:${sessionId}`;
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to get session from Redis:", error);
      return null;
    }
  }

  async updateSession(sessionId, updates) {
    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.updateSession(sessionId, updates);
    }

    // Use Redis
    try {
      const key = `session:${sessionId}`;
      const existing = await this.redis.get(key);
      if (!existing) return false;
      
      const sessionData = JSON.parse(existing);
      const updated = { ...sessionData, ...updates, lastAccessed: new Date().toISOString() };
      await this.redis.setEx(key, this.config.ttl, JSON.stringify(updated));
      return true;
    } catch (error) {
      logger.error("Failed to update session in Redis:", error);
      return false;
    }
  }

  async deleteSession(sessionId) {
    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.deleteSession(sessionId);
    }

    // Use Redis
    try {
      const key = `session:${sessionId}`;
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error("Failed to delete session from Redis:", error);
      return false;
    }
  }

  async extendSession(sessionId, additionalTime = null) {
    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.extendSession(sessionId, additionalTime);
    }

    // Use Redis
    try {
      const key = `session:${sessionId}`;
      const ttl = additionalTime || this.config.ttl;
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error("Failed to extend session in Redis:", error);
      return false;
    }
  }

  getStats() {
    if (this.useMemoryFallback && this.memoryManager) {
      return this.memoryManager.getStats();
    }

    return {
      totalSessions: 0,
      activeSessions: 0,
      memoryUsage: 0,
      cleanupRuns: 0,
      lastCleanup: null,
    };
  }

  async cleanup() {
    if (this.useMemoryFallback && this.memoryManager) {
      return await this.memoryManager.cleanup();
    }

    return { cleaned: 0, remaining: 0 };
  }
}

// ✅ Singleton instance
export const sessionManager = new SessionManager();

/**
 * Session middleware for Express
 */
export function sessionMiddleware(req, res, next) {
  req.session = {
    create: async (userId, userData = {}) => {
      const { sessionId, sessionData } = await sessionManager.createSession(
        userId,
        userData
      );

      res.cookie(SESSION_CONFIG.cookieName, sessionId, {
        maxAge: SESSION_CONFIG.ttl * 1000,
        httpOnly: SESSION_CONFIG.httpOnly,
        secure: SESSION_CONFIG.secure,
        sameSite: SESSION_CONFIG.sameSite,
      });

      return { sessionId, sessionData };
    },

    get: async () => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) return null;
      return await sessionManager.getSession(sessionId);
    },

    update: async (updates) => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) return false;
      return await sessionManager.updateSession(sessionId, updates);
    },

    destroy: async () => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) return false;

      const result = await sessionManager.deleteSession(sessionId);
      res.clearCookie(SESSION_CONFIG.cookieName);
      return result;
    },

    extend: async (additionalTime) => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) return false;
      return await sessionManager.extendSession(sessionId, additionalTime);
    },
  };

  // Auto-load session data if session ID exists
  try {
    const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
    if (sessionId) {
      sessionManager
        .getSession(sessionId)
        .then((sessionData) => {
          if (sessionData) {
            req.sessionData = sessionData;
            req.sessionId = sessionId;
          }
        })
        .catch((error) => logger.error("Failed to load session data:", error));
    }
  } catch (error) {
    logger.error("Session middleware error:", error);
  }

  next();
}

/**
 * Authentication middleware that requires a valid session
 */
export function requireAuth(req, res, next) {
  if (!req.sessionData || !req.sessionData.userId) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }
  next();
}

// ✅ Clean exports
export { SESSION_CONFIG };
export default sessionManager;
