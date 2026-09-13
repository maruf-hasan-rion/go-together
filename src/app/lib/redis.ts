import { createClient, type RedisClientType } from "redis";
import config from "../../config/index.js";

let client: RedisClientType | null = null;

/**
 * Returns a connected Redis client, or null when REDIS_URL is not set
 * (development/tests then fall back to the in-memory store).
 */
export const getRedis = async (): Promise<RedisClientType | null> => {
  if (!config.redis_url) return null;

  if (!client) {
    client = createClient({ url: config.redis_url });
    client.on("error", (error: Error) => {
      console.error("Redis error:", error.message);
    });
    await client.connect();
  }

  return client;
};
