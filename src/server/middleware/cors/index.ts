import { FastifyInstance } from "fastify";
import { fastifyCors } from "./cors";

export const withCors = async (server: FastifyInstance) => {
  server.addHook("preHandler", (request, reply, next) => {
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
