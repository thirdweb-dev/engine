import { Redis } from "ioredis";
import { env } from "../env.js";
import { logger } from "../logger.js";

// ioredis has issues with batches over 100k+ (source: https://github.com/redis/ioredis/issues/801).
export const MAX_REDIS_BATCH_SIZE = 50_000;

export const redis = new Redis(env.REDIS_URL, {
  enableAutoPipelining: true,
  maxRetriesPerRequest: null,
});
try {
  await redis.config("SET", "maxmemory", env.REDIS_MAXMEMORY);
} catch (error) {
  logger({
    level: "error",
    message: `Initializing Redis: ${error}`,
    service: "worker",
  });
}

redis.on("error", (error) => () => {
  logger({
    level: "error",
    message: `Redis error: ${error}`,
    service: "worker",
  });
});
redis.on("ready", () => {
  logger({
    level: "debug",
    message: "Redis ready",
    service: "worker",
  });
});

export const isRedisReachable = async () => {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
};
