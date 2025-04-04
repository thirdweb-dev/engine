import { Redis } from "ioredis";
import { env } from "./env.js";
import { initializeLogger } from "./logger.js";

const redisLogger = initializeLogger("redis");

// ioredis has issues with batches over 100k+ (source: https://github.com/redis/ioredis/issues/801).
export const MAX_REDIS_BATCH_SIZE = 50_000;

export const redis = new Redis(env.REDIS_URL, {
  enableAutoPipelining: true,
  maxRetriesPerRequest: null,
});

try {
  await redis.config("SET", "maxmemory", env.REDIS_MAXMEMORY);
} catch (error) {
  redisLogger.error("Initializing Redis", error);
}

redis.on("error", (error) => () => {
  redisLogger.error("Redis error", error);
});
redis.on("ready", () => {
  redisLogger.info("Redis ready");
});

export async function isRedisReachable() {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
