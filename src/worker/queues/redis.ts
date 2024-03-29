import Redis from "ioredis";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => () => {
  logger({
    level: "error",
    message: `Redis error: ${err}`,
    service: "database",
  });
});
redis.on("connect", () =>
  logger({
    level: "info",
    message: "Redis connected",
    service: "database",
  }),
);
redis.on("reconnecting", () =>
  logger({
    level: "info",
    message: "Redis reconnecting",
    service: "database",
  }),
);
redis.on("ready", () => {
  logger({
    level: "info",
    message: "Redis ready",
    service: "database",
  });
});
