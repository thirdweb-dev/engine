import type { FastifyInstance } from "fastify";
import { fastifyCors } from "./cors";

export function withCors(server: FastifyInstance) {
  server.addHook("onRequest", (request, reply, next) => {
    fastifyCors(
      server,
      request,
      reply,
      {
        credentials: true,
      },
      next,
    );
  });
}
