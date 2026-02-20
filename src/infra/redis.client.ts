import { appConfig } from '../config/app.config';
import { logger } from './logger';
import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL, {
      lazyConnect: true
    });
    redisInstance.on('error', (err: Error) => {
      logger.error('Redis connection error', err);
    });
  }

  return redisInstance;
}

class RedisClientWrapper {
  isAvailable(): boolean {
    return !!process.env.REDIS_URL;
  }

  async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const result = await redis.get(key);
      return result ? JSON.parse(result) as T : null;
    } catch (error) {
      logger.error('Failed to get value from Redis', error as Error, { key });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds || Math.ceil(appConfig.session.ttlMs / 1000);

      const result = await redis.set(key, serialized, 'EX', ttl);
      return result === 'OK';
    } catch (error) {
      logger.error('Failed to set value in Redis', error as Error, { key });
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const result = await redis.del(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to delete key from Redis', error as Error, { key });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check key existence in Redis', error as Error, { key });
      return false;
    }
  }

  async ttl(key: string): Promise<number | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
      const result = await redis.ttl(key);
      return result >= 0 ? result : null;
    } catch (error) {
      logger.error('Failed to get TTL from Redis', error as Error, { key });
      return null;
    }
  }

  async ping(): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const result = await redis.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', error as Error);
      return false;
    }
  }

  async incr(key: string): Promise<number | null> {
    const redis = getRedis();
    if (!redis) return null;
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error('Failed to incr key in Redis', error as Error, { key });
      return null;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const redis = getRedis();
    if (!redis) return false;
    try {
      const result = await redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Failed to expire key in Redis', error as Error, { key });
      return false;
    }
  }
}

export const redisClient = new RedisClientWrapper();
