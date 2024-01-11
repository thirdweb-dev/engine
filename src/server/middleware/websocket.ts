import WebSocketPlugin from "@fastify/websocket";
import { FastifyInstance } from "fastify";
import { logger } from "../../utils/logger";

export const withWebSocket = async (server: FastifyInstance) => {
  await server.register(WebSocketPlugin, {
    errorHandler: function (
      error,
      conn /* SocketStream */,
      req /* FastifyRequest */,
      reply /* FastifyReply */,
    ) {
      logger({
        service: "websocket",
        level: "error",
        message: `Websocket error: ${error}`,
      });
      // Do stuff
      // destroy/close connection
      conn.destroy(error);
    },
  });
};
