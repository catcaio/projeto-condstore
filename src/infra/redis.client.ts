/**
 * Redis client for session storage.
 * Provides type-safe operations with automatic retry and error handling.
 */

import { appConfig } from '../config/app.config';
import { ErrorCode, InfrastructureError } from './errors';
import { logger } from './logger';

interface RedisConfig {
  url: string;
  token: string;
}

interface RedisResponse<T = unknown> {
  result: T;
  error?: string;
}

class RedisClient {
  private config: RedisConfig | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      if (process.env.NODE_ENV === 'production') {
        throw new InfrastructureError(
          ErrorCode.INTERNAL_ERROR,
          'Redis credentials not found in production environment',
          { url: !!url, token: !!token }
        );
      }
      logger.warn('Redis credentials not found. Session storage will be disabled.');
      this.isConnected = false;
      return;
    }

    this.config = { url, token };
    this.isConnected = true;
    logger.info('Redis connected successfully');
  }

  /**
   * Check if Redis is available.
   */
  isAvailable(): boolean {
    return this.isConnected && this.config !== null;
  }

  /**
   * Execute Redis command with retry logic.
   */
  private async execute<T>(
    command: string,
    maxRetries: number = 2
  ): Promise<T | null> {
    if (!this.isAvailable() || !this.config) {
      return null;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${this.config.url}/${command}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.config.token}`,
          },
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
          throw new InfrastructureError(
            ErrorCode.REDIS_OPERATION_ERROR,
            `Redis operation failed: ${response.status}`,
            { command, status: response.status }
          );
        }

        const data: RedisResponse<T> = await response.json();

        logger.http('GET', `redis/${command}`, response.status, duration);

        if (data.error) {
          throw new InfrastructureError(
            ErrorCode.REDIS_OPERATION_ERROR,
            `Redis error: ${data.error}`,
            { command }
          );
        }

        return data.result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500; // Exponential backoff
          logger.warn(`Redis operation failed, retrying in ${delay}ms`, { attempt, command }, error as Error);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('Redis operation failed after retries', lastError!, { command });
    return null;
  }

  /**
   * Get value from Redis.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.execute<string>(`get/${key}`);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Failed to get value from Redis', error as Error, { key });
      return null;
    }
  }

  /**
   * Set value in Redis with TTL.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const encodedValue = encodeURIComponent(serialized);

      const ttl = ttlSeconds || Math.ceil(appConfig.session.ttlMs / 1000);
      const command = `set/${key}/${encodedValue}/ex/${ttl}`;

      const result = await this.execute<string>(command);
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to set value in Redis', error as Error, { key });
      return false;
    }
  }

  /**
   * Delete key from Redis.
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.execute<number>(`del/${key}`);
      return result === 1;
    } catch (error) {
      logger.error('Failed to delete key from Redis', error as Error, { key });
      return false;
    }
  }

  /**
   * Check if key exists in Redis.
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.execute<number>(`exists/${key}`);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check key existence in Redis', error as Error, { key });
      return false;
    }
  }

  /**
   * Get TTL (time to live) for a key in seconds.
   */
  async ttl(key: string): Promise<number | null> {
    try {
      const result = await this.execute<number>(`ttl/${key}`);
      return result !== null && result >= 0 ? result : null;
    } catch (error) {
      logger.error('Failed to get TTL from Redis', error as Error, { key });
      return null;
    }
  }

  /**
   * Ping Redis to check connection.
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.execute<string>('ping');
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
