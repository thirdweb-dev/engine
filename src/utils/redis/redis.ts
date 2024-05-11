import Redis from "ioredis";
import { env } from "../env";
import { logger } from "../logger";

export let redis: Redis | null;

if (env.REDIS_URL) {
  try {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    redis.on("error", (err) => () => {
      logger({
        level: "error",
        message: `Redis error: ${err}`,
        service: "worker",
      });
    });
    redis.on("connect", () =>
      logger({
        level: "info",
        message: "Redis connected",
        service: "worker",
      }),
    );
    redis.on("reconnecting", () =>
      logger({
        level: "info",
        message: "Redis reconnecting",
        service: "worker",
      }),
    );
    redis.on("ready", () => {
      logger({
        level: "info",
        message: "Redis ready",
        service: "worker",
      });
    });
  } catch (e) {
    logger({
      level: "error",
      message: `Error initializing Redis: ${e}`,
      service: "worker",
    });
  }
}
