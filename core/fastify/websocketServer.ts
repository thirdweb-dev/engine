import WebSocket from "ws";

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

export function onConnection(connection: ExtendedWebSocket) {
  connection.isAlive = true;
  connection.on("error", console.error);
  connection.on("pong", () => {
    connection.isAlive = true;
  });
}

export function checkConnection(websocketServer: WebSocket.Server) {
  return setInterval(function ping() {
    websocketServer.clients.forEach(function each(ws) {
      if (!("isAlive" in ws)) {
        console.warn("Missing 'isAlive' on socket connection");
        return;
      }

      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30_000);
}

export function closeConnection(interval: NodeJS.Timer) {
  return () => clearTimeout(interval);
}
