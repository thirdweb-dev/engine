import Redis from "ioredis";
import { env } from "../env";
import { logger } from "../logger";

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
    level: "info",
    message: "Redis ready",
    service: "worker",
  });
});

export const isRedisReachable = async () => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
};
