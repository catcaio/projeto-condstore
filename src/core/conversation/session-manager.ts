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
  tenantId: string;
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
   * Get session for a phone number with tenant context.
   * Includes compatibility layer for old session keys.
   */
  async getSession(tenantId: string, phoneNumber: string): Promise<SessionData | null> {
    if (!tenantId) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'tenant_id is required to get session',
        { phoneNumber }
      );
    }

    try {
      // Try Redis first with new key format
      if (redisClient.isAvailable()) {
        const newKey = this.getKey(tenantId, phoneNumber);
        let session = await redisClient.get<SessionData>(newKey);

        if (session) {
          logger.debug('Session retrieved from Redis (new key)', { phoneNumber, tenantId });
          return session;
        }

        // Compatibility layer: check old key format
        const oldKey = this.getOldKey(phoneNumber);
        session = await redisClient.get<SessionData>(oldKey);

        if (session) {
          logger.warn('Session found with old key format, migrating', {
            phoneNumber,
            tenantId,
            event: 'session_reset',
          });

          // Delete old session
          await redisClient.delete(oldKey);

          // Return null to force session recreation with new key
          return null;
        }

        return null;
      }

      // Redis unavailable
      if (appConfig.env === 'production') {
        throw new InfrastructureError(
          ErrorCode.INTERNAL_ERROR,
          'Redis unavailable in production — cannot retrieve session',
          { phoneNumber, tenantId }
        );
      }

      // Fallback to memory (development/test only)
      const session = this.memoryStore.get(phoneNumber);

      if (session) {
        logger.debug('Session retrieved from memory (dev fallback)', { phoneNumber, tenantId });
      }

      return session;
    } catch (error) {
      if (error instanceof InfrastructureError) throw error;
      logger.error('Failed to get session', error as Error, { phoneNumber, tenantId });
      return null;
    }
  }

  /**
   * Create a new session with tenant context.
   */
  async createSession(tenantId: string, phoneNumber: string): Promise<SessionData> {
    if (!tenantId) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'tenant_id is required to create session',
        { phoneNumber }
      );
    }

    const now = Date.now();
    const expiresAt = now + appConfig.session.ttlMs;

    const session: SessionData = {
      tenantId,
      phoneNumber,
      currentState: ConversationState.IDLE,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      errorCount: 0,
    };

    await this.saveSession(tenantId, phoneNumber, session);

    logger.info('Session created', { phoneNumber, tenantId, expiresAt: new Date(expiresAt).toISOString() });

    return session;
  }

  /**
   * Update an existing session.
   */
  async updateSession(tenantId: string, phoneNumber: string, updates: Partial<ConversationContext>): Promise<SessionData> {
    if (!tenantId) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'tenant_id is required to update session',
        { phoneNumber }
      );
    }

    let session = await this.getSession(tenantId, phoneNumber);

    if (!session) {
      logger.warn('Session not found, creating new session', { phoneNumber, tenantId });
      session = await this.createSession(tenantId, phoneNumber);
    }

    const updatedSession: SessionData = {
      ...session,
      ...updates,
      tenantId, // Ensure tenantId is not overwritten
      phoneNumber, // Ensure phoneNumber is not overwritten
      updatedAt: Date.now(),
    };

    await this.saveSession(tenantId, phoneNumber, updatedSession);

    logger.debug('Session updated', { phoneNumber, tenantId, updates });

    return updatedSession;
  }

  /**
   * Save session to storage with tenant-scoped key.
   */
  private async saveSession(tenantId: string, phoneNumber: string, session: SessionData): Promise<void> {
    const ttlSeconds = Math.ceil(appConfig.session.ttlMs / 1000);

    // Save to Redis
    if (redisClient.isAvailable()) {
      const success = await redisClient.set(this.getKey(tenantId, phoneNumber), session, ttlSeconds);

      if (success) {
        logger.debug('Session saved to Redis', { phoneNumber, tenantId });
      } else {
        if (appConfig.env === 'production') {
          throw new InfrastructureError(
            ErrorCode.INTERNAL_ERROR,
            'Failed to save session to Redis in production',
            { phoneNumber, tenantId }
          );
        }
        logger.warn('Failed to save session to Redis, using memory fallback', { phoneNumber, tenantId });
      }
    } else if (appConfig.env === 'production') {
      throw new InfrastructureError(
        ErrorCode.INTERNAL_ERROR,
        'Redis unavailable in production — cannot save session',
        { phoneNumber, tenantId }
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
  async deleteSession(tenantId: string, phoneNumber: string): Promise<void> {
    if (!tenantId) {
      throw new BusinessError(
        ErrorCode.VALIDATION_ERROR,
        'tenant_id is required to delete session',
        { phoneNumber }
      );
    }

    // Delete from Redis
    if (redisClient.isAvailable()) {
      await redisClient.delete(this.getKey(tenantId, phoneNumber));
    }

    // Delete from memory
    this.memoryStore.delete(phoneNumber);

    logger.info('Session deleted', { phoneNumber, tenantId });
  }

  /**
   * Check if a session exists and is valid.
   */
  async sessionExists(tenantId: string, phoneNumber: string): Promise<boolean> {
    const session = await this.getSession(tenantId, phoneNumber);
    return session !== null;
  }

  /**
   * Get session TTL in seconds.
   */
  async getSessionTTL(tenantId: string, phoneNumber: string): Promise<number | null> {
    if (redisClient.isAvailable()) {
      return await redisClient.ttl(this.getKey(tenantId, phoneNumber));
    }

    const session = this.memoryStore.get(phoneNumber);
    if (!session) return null;

    const ttlMs = session.expiresAt - Date.now();
    return Math.ceil(ttlMs / 1000);
  }

  /**
   * Extend session expiration.
   */
  async extendSession(tenantId: string, phoneNumber: string): Promise<void> {
    const session = await this.getSession(tenantId, phoneNumber);

    if (!session) {
      throw new BusinessError(
        ErrorCode.SESSION_NOT_FOUND,
        'Cannot extend session: session not found',
        { phoneNumber, tenantId }
      );
    }

    session.expiresAt = Date.now() + appConfig.session.ttlMs;
    await this.saveSession(tenantId, phoneNumber, session);

    logger.debug('Session extended', { phoneNumber, tenantId, expiresAt: new Date(session.expiresAt).toISOString() });
  }

  /**
   * Get Redis key for a phone number with tenant scope.
   * New format: session:${tenantId}:${phoneNumber}
   */
  private getKey(tenantId: string, phoneNumber: string): string {
    return `session:${tenantId}:${phoneNumber}`;
  }

  /**
   * Get old Redis key format for compatibility layer.
   * Old format: session:${phoneNumber}
   */
  private getOldKey(phoneNumber: string): string {
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
