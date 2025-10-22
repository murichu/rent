import Redis from 'ioredis';
import logger from '../utils/logger.js';

// Redis client for session storage
let sessionRedis;

try {
  sessionRedis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 1, // Use different database for sessions
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keyPrefix: 'session:',
  });

  sessionRedis.on('error', (err) => {
    logger.error('Redis session connection error:', err);
  });

  sessionRedis.on('connect', () => {
    logger.info('Redis session store connected');
  });
} catch (error) {
  logger.error('Failed to initialize Redis session store:', error);
}

/**
 * Session configuration
 */
const SESSION_CONFIG = {
  ttl: parseInt(process.env.SESSION_TTL) || 24 * 60 * 60, // 24 hours in seconds
  cookieName: process.env.SESSION_COOKIE_NAME || 'haven_session',
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict'
};

/**
 * Session Manager Class
 * Handles stateless session management using Redis
 */
class SessionManager {
  constructor() {
    this.redis = sessionRedis;
    this.config = SESSION_CONFIG;
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create a new session
   */
  async createSession(userId, userData = {}) {
    if (!this.redis) {
      throw new Error('Redis session store not available');
    }

    const sessionId = this.generateSessionId();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      ...userData
    };

    try {
      await this.redis.setex(sessionId, this.config.ttl, JSON.stringify(sessionData));
      
      logger.debug(`Session created for user ${userId}`, {
        sessionId,
        ttl: this.config.ttl
      });

      return sessionId;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw error;
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId) {
    if (!this.redis || !sessionId) {
      return null;
    }

    try {
      const sessionData = await this.redis.get(sessionId);
      if (!sessionData) {
        return null;
      }

      const parsed = JSON.parse(sessionData);
      
      // Update last accessed time
      parsed.lastAccessed = new Date().toISOString();
      await this.redis.setex(sessionId, this.config.ttl, JSON.stringify(parsed));

      return parsed;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(sessionId, updates) {
    if (!this.redis || !sessionId) {
      return false;
    }

    try {
      const existingData = await this.getSession(sessionId);
      if (!existingData) {
        return false;
      }

      const updatedData = {
        ...existingData,
        ...updates,
        lastAccessed: new Date().toISOString()
      };

      await this.redis.setex(sessionId, this.config.ttl, JSON.stringify(updatedData));
      return true;
    } catch (error) {
      logger.error('Failed to update session:', error);
      return false;
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId) {
    if (!this.redis || !sessionId) {
      return false;
    }

    try {
      const result = await this.redis.del(sessionId);
      logger.debug(`Session destroyed: ${sessionId}`);
      return result > 0;
    } catch (error) {
      logger.error('Failed to destroy session:', error);
      return false;
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId, additionalTime = null) {
    if (!this.redis || !sessionId) {
      return false;
    }

    try {
      const ttl = additionalTime || this.config.ttl;
      const result = await this.redis.expire(sessionId, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Failed to extend session:', error);
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId) {
    if (!this.redis) {
      return [];
    }

    try {
      const keys = await this.redis.keys('*');
      const sessions = [];

      for (const key of keys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          if (parsed.userId === userId) {
            sessions.push({
              sessionId: key,
              ...parsed
            });
          }
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId) {
    if (!this.redis) {
      return 0;
    }

    try {
      const sessions = await this.getUserSessions(userId);
      let destroyedCount = 0;

      for (const session of sessions) {
        const result = await this.redis.del(session.sessionId);
        if (result > 0) {
          destroyedCount++;
        }
      }

      logger.info(`Destroyed ${destroyedCount} sessions for user ${userId}`);
      return destroyedCount;
    } catch (error) {
      logger.error('Failed to destroy user sessions:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions (maintenance task)
   */
  async cleanupExpiredSessions() {
    if (!this.redis) {
      return 0;
    }

    try {
      // Redis automatically handles TTL expiration, but we can log stats
      const info = await this.redis.info('keyspace');
      logger.debug('Session store info:', info);
      return 0;
    } catch (error) {
      logger.error('Failed to cleanup sessions:', error);
      return 0;
    }
  }
}

// Global session manager instance
const sessionManager = new SessionManager();

/**
 * Middleware to handle stateless sessions
 * Replaces traditional express-session for horizontal scaling
 */
export function sessionMiddleware(req, res, next) {
  // Add session methods to request object
  req.session = {
    create: async (userId, userData) => {
      const sessionId = await sessionManager.createSession(userId, userData);
      
      // Set session cookie
      res.cookie(SESSION_CONFIG.cookieName, sessionId, {
        maxAge: SESSION_CONFIG.ttl * 1000,
        httpOnly: SESSION_CONFIG.httpOnly,
        secure: SESSION_CONFIG.secure,
        sameSite: SESSION_CONFIG.sameSite
      });
      
      return sessionId;
    },

    get: async () => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) {
        return null;
      }
      return await sessionManager.getSession(sessionId);
    },

    update: async (updates) => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) {
        return false;
      }
      return await sessionManager.updateSession(sessionId, updates);
    },

    destroy: async () => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) {
        return false;
      }
      
      const result = await sessionManager.destroySession(sessionId);
      
      // Clear session cookie
      res.clearCookie(SESSION_CONFIG.cookieName);
      
      return result;
    },

    extend: async (additionalTime) => {
      const sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
      if (!sessionId) {
        return false;
      }
      return await sessionManager.extendSession(sessionId, additionalTime);
    }
  };

  next();
}

/**
 * Middleware to load session data into request
 */
export async function loadSessionMiddleware(req, res, next) {
  try {
    const sessionData = await req.session.get();
    if (sessionData) {
      req.sessionData = sessionData;
      req.sessionId = req.cookies?.[SESSION_CONFIG.cookieName];
    }
  } catch (error) {
    logger.error('Failed to load session:', error);
  }
  
  next();
}

/**
 * Middleware to require active session
 */
export async function requireSessionMiddleware(req, res, next) {
  const sessionData = await req.session.get();
  
  if (!sessionData) {
    return res.status(401).json({
      success: false,
      error: 'No active session found',
      code: 'SESSION_REQUIRED'
    });
  }
  
  req.sessionData = sessionData;
  next();
}

export { sessionManager, SESSION_CONFIG };
export default sessionManager;