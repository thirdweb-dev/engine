import type { FastifyInstance } from "fastify";

export function withSecurityHeaders(server: FastifyInstance) {
  server.addHook("onSend", (_request, reply, payload) => {
    reply.headers({
      "Strict-Transport-Security":
        "max-age=31536000; includeSubDomains; preload",
      "Content-Security-Policy": "default-src 'none';",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
    });

    return payload;
  });
}
