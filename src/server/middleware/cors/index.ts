import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { ParsedConfig } from "../../../schema/config";

const STANDARD_HEADERS = "Authorization,Content-Type,Cookie";
const STANDARD_METHODS = "GET,HEAD,PUT,PATCH,POST,DELETE";

export function withCors(server: FastifyInstance, config: ParsedConfig) {
  server.addHook("onRequest", (request, reply, next) => {
    reply.header("Vary", "Origin");

    const origin = request.headers.origin;
    if (!origin) {
      // Don't enforce call for backend calls (no origin header).
      return next();
    }

    const allowedOrigins = config.accessControlAllowOrigin.split(",");
    const isAllowed = allowedOrigins
      // Sanitize the allowed origins list.
      .map(sanitizeOrigin)
      // Check if the origin matches any allowed origins.
      .some((allowed) => {
        if (allowed.includes("thirdweb-preview.com")) {
          return /^https?:\/\/.*\.thirdweb-preview\.com$/.test(origin);
        }
        if (allowed.includes("thirdweb-dev.com")) {
          return /^https?:\/\/.*\.thirdweb-dev\.com$/.test(origin);
        }

        // Allow wildcards in the origin. For example "foo.example.com" matches "*.example.com"
        if (allowed.includes("*")) {
          const wildcardPattern = allowed.replace("*", ".*");
          const regex = new RegExp(`^${wildcardPattern}$`);
          return regex.test(origin);
        }
        // Otherwise check for an exact match.
        return origin === allowed;
      });
    if (!isAllowed) {
      reply.code(StatusCodes.FORBIDDEN).send({ error: "Origin not allowed" });
      return;
    }

    // Set CORS headers
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      reply.header("Access-Control-Allow-Methods", STANDARD_METHODS);
      reply.header("Access-Control-Allow-Headers", STANDARD_HEADERS);
      // reply.header("Access-Control-Max-Age", "3600"); // 1 hour
      reply.code(204).send();
      return;
    }

    return next();
  });
}

function sanitizeOrigin(origin: string) {
  if (origin.endsWith("/")) {
    return origin.slice(0, -1);
  }
  return origin;
}
