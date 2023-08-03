import { FastifyInstance } from "fastify";
import type WebSocket from "ws";

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export function onConnection(server: FastifyInstance) {
  return (connection: ExtendedWebSocket) => {
    connection.isAlive = true;
    connection.on("error", server.log.error);
    connection.on("pong", () => {
      connection.isAlive = true;
    });
  };
}
export function checkConnection(server: FastifyInstance) {
  return (websocketServer: WebSocket.Server) => {
    return setInterval(() => {
      websocketServer.clients.forEach((ws: WebSocket) => {
        if (!("isAlive" in ws)) {
          server.log.warn("Missing 'isAlive' on socket connection");
          return;
        }

        if (ws.isAlive === false) return ws.terminate();

        ws.isAlive = false;
        ws.ping();
      });
    }, 30_000);
  };
}

export function closeConnection(interval: NodeJS.Timer) {
  return () => clearTimeout(interval);
}
