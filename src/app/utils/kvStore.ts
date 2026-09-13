import { getRedis } from "../lib/redis.js";

/**
 * Small key/value store for short-lived tokens.
 * Uses Redis when REDIS_URL is configured; otherwise an in-memory map so
 * local development works without extra infrastructure.
 */
const memory = new Map<string, { value: string; expiresAt: number }>();

const memoryGet = (key: string): string | null => {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
};

export const kv = {
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      await redis.set(key, value, { EX: ttlSeconds });
      return;
    }
    memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },

  async get(key: string): Promise<string | null> {
    const redis = await getRedis();
    if (redis) {
      return redis.get(key);
    }
    return memoryGet(key);
  },

  async del(key: string): Promise<void> {
    const redis = await getRedis();
    if (redis) {
      await redis.del(key);
      return;
    }
    memory.delete(key);
  },
};
