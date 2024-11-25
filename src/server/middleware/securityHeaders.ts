import type { FastifyInstance } from "fastify";

export function withSecurityHeaders(server: FastifyInstance) {
  server.addHook("onSend", async (_request, reply, payload) => {
    reply.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    reply.header("Content-Security-Policy", "default-src 'none';");
    reply.header("X-Frame-Options", "DENY");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header(
      "Permissions-Policy",
      "geolocation=(), camera=(), microphone=()",
    );

    return payload;
  });
}
