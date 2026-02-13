/**
 * Session Manager.
 * Manages conversation sessions with Redis persistence and in-memory fallback.
 * Provides type-safe session operations.
 */

import { appConfig } from '../../config/app.config';
import { BusinessError, ErrorCode, InfrastructureError } from '../../infra/errors';
import { logger } from '../../infra/logger';
import { redisClient } from '../../infra/redis.client';
import { ConversationState, type ConversationContext } from './state-machine';

/**
 * Session data stored in Redis.
 */
export interface SessionData extends ConversationContext {
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

/**
 * In-memory session storage (fallback when Redis is unavailable).
 */
class InMemorySessionStore {
  private store: Map<string, SessionData> = new Map();

  get(phoneNumber: string): SessionData | null {
    const session = this.store.get(phoneNumber);

    if (!session) return null;

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.store.delete(phoneNumber);
      return null;
    }

    return session;
  }

  set(phoneNumber: string, session: SessionData): void {
    this.store.set(phoneNumber, session);
  }

  delete(phoneNumber: string): void {
    this.store.delete(phoneNumber);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [phoneNumber, session] of this.store.entries()) {
      if (now > session.expiresAt) {
        this.store.delete(phoneNumber);
      }
    }
  }
}

class SessionManager {
  private memoryStore = new InMemorySessionStore();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval for in-memory store
    this.startCleanup();
  }

  /**
   * Get session for a phone number.
   */
  async getSession(phoneNumber: string): Promise<SessionData | null> {
    try {
      // Try Redis first
      if (redisClient.isAvailable()) {
        const session = await redisClient.get<SessionData>(this.getKey(phoneNumber));

        if (session) {
          logger.debug('Session retrieved from Redis', { phoneNumber });
          return session;
        }

        return null;
      }

      // Redis unavailable
      if (appConfig.env === 'production') {
        throw new InfrastructureError(
          ErrorCode.INTERNAL_ERROR,
          'Redis unavailable in production — cannot retrieve session',
          { phoneNumber }
        );
      }

      // Fallback to memory (development/test only)
      const session = this.memoryStore.get(phoneNumber);

      if (session) {
        logger.debug('Session retrieved from memory (dev fallback)', { phoneNumber });
      }

      return session;
    } catch (error) {
      if (error instanceof InfrastructureError) throw error;
      logger.error('Failed to get session', error as Error, { phoneNumber });
      return null;
    }
  }

  /**
   * Create a new session.
   */
  async createSession(phoneNumber: string): Promise<SessionData> {
    const now = Date.now();
    const expiresAt = now + appConfig.session.ttlMs;

    const session: SessionData = {
      phoneNumber,
      currentState: ConversationState.IDLE,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      errorCount: 0,
    };

    await this.saveSession(phoneNumber, session);

    logger.info('Session created', { phoneNumber, expiresAt: new Date(expiresAt).toISOString() });

    return session;
  }

  /**
   * Update an existing session.
   */
  async updateSession(phoneNumber: string, updates: Partial<ConversationContext>): Promise<SessionData> {
    let session = await this.getSession(phoneNumber);

    if (!session) {
      logger.warn('Session not found, creating new session', { phoneNumber });
      session = await this.createSession(phoneNumber);
    }

    const updatedSession: SessionData = {
      ...session,
      ...updates,
      phoneNumber, // Ensure phoneNumber is not overwritten
      updatedAt: Date.now(),
    };

    await this.saveSession(phoneNumber, updatedSession);

    logger.debug('Session updated', { phoneNumber, updates });

    return updatedSession;
  }

  /**
   * Save session to storage.
   */
  private async saveSession(phoneNumber: string, session: SessionData): Promise<void> {
    const ttlSeconds = Math.ceil(appConfig.session.ttlMs / 1000);

    // Save to Redis
    if (redisClient.isAvailable()) {
      const success = await redisClient.set(this.getKey(phoneNumber), session, ttlSeconds);

      if (success) {
        logger.debug('Session saved to Redis', { phoneNumber });
      } else {
        if (appConfig.env === 'production') {
          throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Failed to save session to Redis in production',
            { phoneNumber }
          );
        }
        logger.warn('Failed to save session to Redis, using memory fallback', { phoneNumber });
      }
    } else if (appConfig.env === 'production') {
      throw new InfrastructureError(
        ErrorCode.INTERNAL_ERROR,
        'Redis unavailable in production — cannot save session',
        { phoneNumber }
      );
    }

    // Save to memory only in development/test
    if (appConfig.env !== 'production') {
      this.memoryStore.set(phoneNumber, session);
    }
  }

  /**
   * Delete a session.
   */
  async deleteSession(phoneNumber: string): Promise<void> {
    // Delete from Redis
    if (redisClient.isAvailable()) {
      await redisClient.delete(this.getKey(phoneNumber));
    }

    // Delete from memory
    this.memoryStore.delete(phoneNumber);

    logger.info('Session deleted', { phoneNumber });
  }

  /**
   * Check if a session exists and is valid.
   */
  async sessionExists(phoneNumber: string): Promise<boolean> {
    const session = await this.getSession(phoneNumber);
    return session !== null;
  }

  /**
   * Get session TTL in seconds.
   */
  async getSessionTTL(phoneNumber: string): Promise<number | null> {
    if (redisClient.isAvailable()) {
      return await redisClient.ttl(this.getKey(phoneNumber));
    }

    const session = this.memoryStore.get(phoneNumber);
    if (!session) return null;

    const ttlMs = session.expiresAt - Date.now();
    return Math.ceil(ttlMs / 1000);
  }

  /**
   * Extend session expiration.
   */
  async extendSession(phoneNumber: string): Promise<void> {
    const session = await this.getSession(phoneNumber);

    if (!session) {
      throw new BusinessError(
        ErrorCode.SESSION_NOT_FOUND,
        'Cannot extend session: session not found',
        { phoneNumber }
      );
    }

    session.expiresAt = Date.now() + appConfig.session.ttlMs;
    await this.saveSession(phoneNumber, session);

    logger.debug('Session extended', { phoneNumber, expiresAt: new Date(session.expiresAt).toISOString() });
  }

  /**
   * Get Redis key for a phone number.
   */
  private getKey(phoneNumber: string): string {
    return `session:${phoneNumber}`;
  }

  /**
   * Start cleanup interval for in-memory store.
   */
  private startCleanup(): void {
    // Run cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.memoryStore.cleanup();
      logger.debug('In-memory session cleanup completed');
    }, 10 * 60 * 1000);
  }

  /**
   * Stop cleanup interval (for graceful shutdown).
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
