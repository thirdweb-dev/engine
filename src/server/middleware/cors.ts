import { createMiddleware } from "hono/factory";

import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

// For standard API routes with configurable origins
export function createApiCorsMiddleware(config: { allowedOrigins: string[] }) {
  return cors({
    origin: (origin) => {
      if (!origin) return undefined;

      const isOriginAllowed = config.allowedOrigins.some((allowed) => {
        if (allowed === "https://thirdweb-preview.com") {
          return /^https?:\/\/.*\.thirdweb-preview\.com$/.test(origin);
        }
        if (allowed === "https://thirdweb-dev.com") {
          return /^https?:\/\/.*\.thirdweb-dev\.com$/.test(origin);
        }
        if (allowed.includes("*")) {
          const wildcardPattern = allowed.replace(/\*/g, ".*");
          const regex = new RegExp(`^${wildcardPattern}$`);
          return regex.test(origin);
        }
        return origin === allowed;
      });

      return isOriginAllowed ? origin : undefined;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "ngrok-skip-browser-warning",
    ],
    maxAge: 3600,
  });
}

// For admin routes that only allow same-origin requests
export const sameOriginMiddleware = createMiddleware(async (c, next) => {
  const origin = c.req.header("origin");
  if (!origin) return await next();

  const host = c.req.header("host");
  const originHost = new URL(origin).host;

  if (originHost !== host) {
    throw new HTTPException(403, { message: "Invalid origin" });
  }

  return await next();
});
