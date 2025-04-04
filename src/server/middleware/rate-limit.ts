import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { redis } from "../../lib/redis.js";
import { env } from "../../lib/env.js";

export const rateLimitMiddleware = createMiddleware(async (_c, next) => {
  const epochTimeInMinutes = Math.floor(Date.now() / (1000 * 60));
  const key = `rate-limit:global:${epochTimeInMinutes}`;

  const count = await redis.incr(key);
  redis.expire(key, 2 * 60);

  if (count > env.GLOBAL_RATE_LIMIT_PER_MIN) {
    throw new HTTPException(429, {
      message: `Too many requests. Please reduce your calls to ${env.GLOBAL_RATE_LIMIT_PER_MIN} requests/minute or update the "GLOBAL_RATE_LIMIT_PER_MIN" env var.`,
    });
  }

  await next();
});
