import logger from '../utils/logger.js';

/**
 * Memory Session Manager
 * Fallback session management using in-memory storage
 * Used when Redis is not available
 */
class MemorySessionManager {
  constructor() {
    this.sessions = new Map();
    this.config = {
      ttl: parseInt(process.env.SESSION_TTL) || 24 * 60 * 60, // 24 hours in seconds
      cookieName: process.env.SESSION_COOKIE_NAME || "haven_session",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
    };
    
    // Cleanup expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
    
    logger.info('✅ Memory Session Manager initialized');
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId() {
    return `mem_${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create a new session
   */
  async createSession(userId, userData = {}) {
    const sessionId = this.generateSessionId();
    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (this.config.ttl * 1000)).toISOString(),
      ...userData,
    };

    this.sessions.set(sessionId, sessionData);

    logger.debug(`Memory session created for user ${userId}`, {
      sessionId,
      ttl: this.config.ttl,
    });

    return sessionId;
  }

  /**
   * Get session data
   */
  async getSession(sessionId) {
    if (!sessionId) {
      return null;
    }

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return null;
    }

    // Check if session has expired
    if (new Date() > new Date(sessionData.expiresAt)) {
      this.sessions.delete(sessionId);
      logger.debug(`Memory session expired: ${sessionId}`);
      return null;
    }

    // Update last accessed time and extend expiry
    sessionData.lastAccessed = new Date().toISOString();
    sessionData.expiresAt = new Date(Date.now() + (this.config.ttl * 1000)).toISOString();
    this.sessions.set(sessionId, sessionData);

    return sessionData;
  }

  /**
   * Update session data
   */
  async updateSession(sessionId, updates) {
    if (!sessionId) {
      return false;
    }

    const existingData = await this.getSession(sessionId);
    if (!existingData) {
      return false;
    }

    const updatedData = {
      ...existingData,
      ...updates,
      lastAccessed: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (this.config.ttl * 1000)).toISOString(),
    };

    this.sessions.set(sessionId, updatedData);
    return true;
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId) {
    if (!sessionId) {
      return false;
    }

    const result = this.sessions.delete(sessionId);
    if (result) {
      logger.debug(`Memory session destroyed: ${sessionId}`);
    }
    return result;
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId, additionalTime = null) {
    if (!sessionId) {
      return false;
    }

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return false;
    }

    const ttl = additionalTime || this.config.ttl;
    sessionData.expiresAt = new Date(Date.now() + (ttl * 1000)).toISOString();
    this.sessions.set(sessionId, sessionData);
    return true;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId) {
    const userSessions = [];

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (sessionData.userId === userId) {
        // Check if session is still valid
        if (new Date() <= new Date(sessionData.expiresAt)) {
          userSessions.push({
            sessionId,
            ...sessionData,
          });
        } else {
          // Clean up expired session
          this.sessions.delete(sessionId);
        }
      }
    }

    return userSessions;
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId) {
    let destroyedCount = 0;

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (sessionData.userId === userId) {
        this.sessions.delete(sessionId);
        destroyedCount++;
      }
    }

    logger.info(`Destroyed ${destroyedCount} memory sessions for user ${userId}`);
    return destroyedCount;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now > new Date(sessionData.expiresAt)) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Cleaned up ${cleanedCount} expired memory sessions`);
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   */
  getStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;

    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now <= new Date(sessionData.expiresAt)) {
        activeCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      total: this.sessions.size,
      active: activeCount,
      expired: expiredCount,
      type: 'memory'
    };
  }

  /**
   * Shutdown and cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.sessions.clear();
    logger.info('Memory Session Manager shutdown completed');
  }
}

export default MemorySessionManager;