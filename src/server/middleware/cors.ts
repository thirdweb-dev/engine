import type { FastifyInstance } from "fastify";
import { getConfig } from "../../utils/cache/getConfig";
import { ADMIN_QUEUES_BASEPATH } from "./adminRoutes";

const STANDARD_METHODS = "GET,POST,DELETE,PUT,PATCH,HEAD,PUT,PATCH,POST,DELETE";
const DEFAULT_ALLOWED_HEADERS = [
  "Authorization",
  "Content-Type",
  "ngrok-skip-browser-warning",
];

export function withCors(server: FastifyInstance) {
  server.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;

    // Allow backend calls (no origin header).
    if (!origin) {
      return;
    }

    // Allow admin routes to be accessed from the same host.
    if (request.url.startsWith(ADMIN_QUEUES_BASEPATH)) {
      const host = request.headers.host;
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        reply.code(403).send({ error: "Invalid origin" });
        return;
      }
      return;
    }

    const config = await getConfig();
    const allowedOrigins = config.accessControlAllowOrigin
      .split(",")
      .map(sanitizeOrigin);

    // Always set `Vary: Origin` to prevent caching issues even on invalid origins.
    reply.header("Vary", "Origin");

    if (isAllowedOrigin(origin, allowedOrigins)) {
      // Set CORS headers if valid origin.
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Methods", STANDARD_METHODS);

      // Handle preflight requests
      if (request.method === "OPTIONS") {
        const requestedHeaders =
          request.headers["access-control-request-headers"];
        reply.header(
          "Access-Control-Allow-Headers",
          requestedHeaders ?? DEFAULT_ALLOWED_HEADERS.join(","),
        );

        reply.header("Cache-Control", "public, max-age=3600");
        reply.header("Access-Control-Max-Age", "3600");
        reply.code(204).send();
        return;
      }
    } else {
      // reply.code(403).send({ error: "Invalid origin" });
      return;
    }
  });
}

function isAllowedOrigin(origin: string, allowedOrigins: string[]) {
  return (
    allowedOrigins
      // Check if the origin matches any allowed origins.
      .some((allowed) => {
        if (allowed === "https://thirdweb-preview.com") {
          return /^https?:\/\/.*\.thirdweb-preview\.com$/.test(origin);
        }
        if (allowed === "https://thirdweb-dev.com") {
          return /^https?:\/\/.*\.thirdweb-dev\.com$/.test(origin);
        }

        // Allow wildcards in the origin. For example "foo.example.com" matches "*.example.com"
        if (allowed.includes("*")) {
          const wildcardPattern = allowed.replace(/\*/g, ".*");
          const regex = new RegExp(`^${wildcardPattern}$`);
          return regex.test(origin);
        }

        // Otherwise check for an exact match.
        return origin === allowed;
      })
  );
}

function sanitizeOrigin(origin: string) {
  if (origin.endsWith("/")) {
    return origin.slice(0, -1);
  }
  return origin;
}
