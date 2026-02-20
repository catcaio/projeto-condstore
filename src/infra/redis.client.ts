import Redis from "ioredis";

let redisInstance: Redis | null = null;

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL);
  }

  return redisInstance;
}
