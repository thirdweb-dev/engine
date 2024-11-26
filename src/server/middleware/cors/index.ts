import type { FastifyInstance } from "fastify";
import { fastifyCors } from "./cors";

export const withCors = async (server: FastifyInstance) => {
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
};
