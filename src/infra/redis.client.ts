import Redis from "ioredis";
import { logger } from './logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

class RedisService {
  private inMemoryCache = new Map<string, CacheEntry<any>>();
  private redisInstance: Redis | null = null;
  private isConnecting: boolean = false;
  /**
   * Tracks whether the Redis connection is actually established and ready.
   * Only set to true on the 'ready' event; reset to false on 'close'/'end'.
   * Kept separate from `redisInstance` because an ioredis object can exist
   * while the underlying TCP connection is not yet up (lazyConnect: true).
   */
  private _ready: boolean = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    if (process.env.REDIS_URL && !this.redisInstance && !this.isConnecting) {
      this.isConnecting = true;
      try {
        this.redisInstance = new Redis(process.env.REDIS_URL, {
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1
        });
        this.redisInstance.on('ready', () => { this._ready = true; });
        this.redisInstance.on('close', () => { this._ready = false; });
        this.redisInstance.on('end',   () => { this._ready = false; });
        this.redisInstance.on('error', (err: Error) => {
          logger.error('Redis connection error', err);
        });
        // Trigger connection eagerly so _ready becomes true as soon as Redis is
        // reachable, instead of waiting for the first command to kick off the
        // lazy-connect handshake (which would block callers for connectTimeout
        // milliseconds when Redis is temporarily unavailable).
        void this.redisInstance.connect().catch((err: Error) => {
          logger.error('Redis initial connect failed', err);
        });
      } catch (err) {
        logger.error('Failed to initialize Redis', err as Error);
        this.redisInstance = null;
      } finally {
        this.isConnecting = false;
      }
    }
  }

  /**
   * Returns true only when a live Redis connection is established and ready.
   * Returns false (triggering in-memory fallback) when:
   *   - REDIS_URL is not set
   *   - the connection hasn't been established yet (startup or reconnect)
   *   - the connection was lost
   */
  isAvailable(): boolean {
    return this._ready;
  }

  async ping(): Promise<boolean> {
    if (this.isAvailable()) {
      try {
        const res = await this.redisInstance!.ping();
        return res === 'PONG';
      } catch (e) {
        return false;
      }
    }
    return true; // Memory fallback is always "available"
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.isAvailable()) {
      try {
        return await this.redisInstance!.keys(pattern);
      } catch (e) {
        logger.error('Redis KEYS error', e as Error, { pattern });
        return [];
      }
    }
    // Memory fallback doesn't actively support pattern matching properly in this simple implementation
    return [];
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isAvailable()) {
      try {
        const val = await this.redisInstance!.get(key);
        return val ? JSON.parse(val) as T : null;
      } catch (e) {
        logger.error('Redis GET error', e as Error, { key });
        return null; // soft fail
      }
    } else {
      const entry = this.inMemoryCache.get(key);
      if (!entry) return null;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        this.inMemoryCache.delete(key);
        return null;
      }
      return entry.value as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.isAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redisInstance!.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisInstance!.set(key, serialized);
        }
      } catch (e) {
        logger.error('Redis SET error', e as Error, { key });
        // soft fail
      }
    } else {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      this.inMemoryCache.set(key, { value, expiresAt });
    }
  }

  async setNx<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    if (this.isAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          const result = await (this.redisInstance as any).set(key, serialized, 'EX', ttlSeconds, 'NX');
          return result === 'OK';
        }
        const result = await (this.redisInstance as any).set(key, serialized, 'NX');
        return result === 'OK';
      } catch (e) {
        logger.error('Redis SET NX error', e as Error, { key });
        return false;
      }
    } else {
      const existing = await this.get<T>(key);
      if (existing !== null) {
        return false;
      }
      await this.set(key, value, ttlSeconds);
      return true;
    }
  }

  async del(key: string): Promise<void> {
    if (this.isAvailable()) {
      try {
        await this.redisInstance!.del(key);
      } catch (e) {
        logger.error('Redis DEL error', e as Error, { key });
      }
    } else {
      this.inMemoryCache.delete(key);
    }
  }

  async incr(key: string): Promise<number> {
    if (this.isAvailable()) {
      try {
        return await this.redisInstance!.incr(key);
      } catch (e) {
        logger.error('Redis INCR error', e as Error, { key });
        return 0; // soft fail
      }
    } else {
      let currentVal = await this.get<number>(key);
      if (typeof currentVal !== 'number') {
        currentVal = 0;
      }
      const newVal = currentVal + 1;

      const existingEntry = this.inMemoryCache.get(key);
      const expiresAt = existingEntry ? existingEntry.expiresAt : null;

      this.inMemoryCache.set(key, { value: newVal, expiresAt });
      return newVal;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.isAvailable()) {
      try {
        await this.redisInstance!.expire(key, ttlSeconds);
      } catch (e) {
        logger.error('Redis EXPIRE error', e as Error, { key });
      }
    } else {
      const entry = this.inMemoryCache.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + ttlSeconds * 1000;
      }
    }
  }

  async ttl(key: string): Promise<number> {
    if (this.isAvailable()) {
      try {
        return await this.redisInstance!.ttl(key);
      } catch (e) {
        logger.error('Redis TTL error', e as Error, { key });
        return -2; // conventional response for missing/error
      }
    } else {
      const entry = this.inMemoryCache.get(key);
      if (!entry) return -2;
      if (entry.expiresAt === null) return -1;
      const remainingMs = entry.expiresAt - Date.now();
      return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : -2;
    }
  }
}

export const redisClient = new RedisService();
