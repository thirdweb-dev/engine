import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { env } from "../../shared/utils/env";
import { redis } from "../../shared/utils/redis/redis";
import { createCustomError } from "./error";
import { OPENAPI_ROUTES } from "./open-api";
import { getTransactionCredentials } from "../../shared/lib/transaction/transaction-credentials";
import { toClientId } from "../../shared/utils/sdk";

const SKIP_RATELIMIT_PATHS = ["/", ...OPENAPI_ROUTES];

export function withRateLimit(server: FastifyInstance) {
  server.addHook("onRequest", async (request, _reply) => {
    if (SKIP_RATELIMIT_PATHS.includes(request.url)) {
      return;
    }

    const epochMinutes = Math.floor(new Date().getTime() / (1000 * 60));

    const globalRateLimitKey = `rate-limit:global:${epochMinutes}`;
    const count = await redis.incr(globalRateLimitKey);
    redis.expire(globalRateLimitKey, 2 * 60);

    if (count > env.GLOBAL_RATE_LIMIT_PER_MIN) {
      throw createCustomError(
        `Too many requests. Please reduce your calls to ${env.GLOBAL_RATE_LIMIT_PER_MIN} requests/minute or update the "GLOBAL_RATE_LIMIT_PER_MIN" env var.`,
        StatusCodes.TOO_MANY_REQUESTS,
        "TOO_MANY_REQUESTS",
      );
    }

    // Lite mode enforces a rate limit per team.
    if (env.ENGINE_MODE === "lite") {
      const { clientId } = getTransactionCredentials(request);
      const clientRateLimitKey = `rate-limit:client-id:${clientId}`;
      const count = await redis.incr(clientRateLimitKey);
      redis.expire(globalRateLimitKey, 2 * 60);

      if (count > env.LITE_CLIENT_RATE_LIMIT_PER_MIN) {
        throw createCustomError(
          `${env.LITE_CLIENT_RATE_LIMIT_PER_MIN} requests/minute rate limit exceeded. Upgrade to Engine Standard to get a dedicated Engine without rate limits.`,
          StatusCodes.TOO_MANY_REQUESTS,
          "TOO_MANY_REQUESTS",
        );
      }
    }
  });
}
