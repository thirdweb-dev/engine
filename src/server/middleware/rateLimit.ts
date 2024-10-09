import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { createCustomError } from "./error";
import { OPENAPI_ROUTES } from "./open-api";

const SKIP_RATELIMIT_PATHS = ["/", ...OPENAPI_ROUTES];

export const withRateLimit = async (server: FastifyInstance) => {
  server.addHook("onRequest", async (request, reply) => {
    if (SKIP_RATELIMIT_PATHS.includes(request.url)) {
      return;
    }

    const epochTimeInMinutes = Math.floor(new Date().getTime() / (1000 * 60));
    const key = `rate-limit:global:${epochTimeInMinutes}`;
    const count = await redis.incr(key);
    redis.expire(key, 2 * 60);

    if (count > env.GLOBAL_RATE_LIMIT_PER_MIN) {
      throw createCustomError(
        `Too many requests. Please reduce your calls to ${env.GLOBAL_RATE_LIMIT_PER_MIN} requests/minute or update the "GLOBAL_RATE_LIMIT_PER_MIN" env var.`,
        StatusCodes.TOO_MANY_REQUESTS,
        "TOO_MANY_REQUESTS",
      );
    }
  });
};
