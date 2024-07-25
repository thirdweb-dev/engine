import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { createCustomError } from "./error";

export const withRateLimit = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    const epochTimeInMinutes = Math.floor(new Date().getTime() / (1000 * 60));
    const key = `rate-limit:global:${epochTimeInMinutes}`;
    const count = await redis.incr(key);
    if (count > env.GLOBAL_RATE_LIMIT_PER_MIN) {
      return createCustomError(
        `Too many requests to this Engine. Please reduce your calls to ${env.GLOBAL_RATE_LIMIT_PER_MIN} requests/minute or update the "GLOBAL_RATE_LIMIT_PER_MIN" env var.`,
        StatusCodes.TOO_MANY_REQUESTS,
        "TOO_MANY_REQUESTS",
      );
    }
  });
};
