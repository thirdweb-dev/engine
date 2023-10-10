import { FastifyBaseLogger } from "fastify";
import Pino, { LoggerOptions } from "pino";
import { env } from "./env";

const defaultOptions: LoggerOptions = {
  redact: ["headers.authorization"],
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname,reqId",
      singleLine: true,
    },
  },
  level:
    env.NODE_ENV === "production"
      ? "info"
      : env.NODE_ENV === "development"
      ? "debug"
      : env.NODE_ENV === "testing"
      ? "debug"
      : "trace",
};

interface Logger {
  server: FastifyBaseLogger;
  worker: FastifyBaseLogger;
}

const createLogger = (options: LoggerOptions) => {
  return Pino({ ...defaultOptions, ...options });
};

export const logger: Logger = {
  server: createLogger({ msgPrefix: "[Server] ", enabled: false }),
  worker: createLogger({ msgPrefix: "[Worker] " }),
};
