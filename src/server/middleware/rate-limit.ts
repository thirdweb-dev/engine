import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../shared/utils/env";
import { redis } from "../../shared/utils/redis/redis";
import { createCustomError } from "./error";
import { OPENAPI_ROUTES } from "./open-api";

const SKIP_RATELIMIT_PATHS = ["/", ...OPENAPI_ROUTES];

export function withRateLimit(server: FastifyInstance) {
  server.addHook("onRequest", async (request, _reply) => {
    if (SKIP_RATELIMIT_PATHS.includes(request.url)) {
      return;
    }

    const epochTimeInMinutes = Math.floor(new Date().getTime() / (1000 * 60));
    
    // Apply both global and per-IP rate limiting for better security
    const globalKey = `rate-limit:global:${epochTimeInMinutes}`;
    const globalCount = await redis.incr(globalKey);
    redis.expire(globalKey, 2 * 60);

    if (globalCount > env.GLOBAL_RATE_LIMIT_PER_MIN) {
      throw createCustomError(
        `Too many requests globally. Please reduce calls to ${env.GLOBAL_RATE_LIMIT_PER_MIN} requests/minute or update the "GLOBAL_RATE_LIMIT_PER_MIN" env var.`,
        StatusCodes.TOO_MANY_REQUESTS,
        "TOO_MANY_REQUESTS",
      );
    }

    // Per-IP rate limiting (1/10 of global limit per IP as a reasonable default)
    const clientIp = request.ip;
    const ipKey = `rate-limit:ip:${clientIp}:${epochTimeInMinutes}`;
    const ipCount = await redis.incr(ipKey);
    redis.expire(ipKey, 2 * 60);
    
    const perIpLimit = Math.floor(env.GLOBAL_RATE_LIMIT_PER_MIN / 10);
    if (ipCount > perIpLimit) {
      throw createCustomError(
        `Too many requests from your IP. Please reduce your calls to ${perIpLimit} requests/minute.`,
        StatusCodes.TOO_MANY_REQUESTS,
        "TOO_MANY_REQUESTS",
      );
    }
  });
}
