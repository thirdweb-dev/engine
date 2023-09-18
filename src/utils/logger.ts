import { FastifyBaseLogger } from "fastify";
import Pino, { LoggerOptions } from "pino";
import { env } from "../../core/env";

const defaultConfig: LoggerOptions = {
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

const createLogger = (prefix: string) => {
  return Pino({ ...defaultConfig, msgPrefix: prefix });
};

export const logger: Logger = {
  server: createLogger("[Server] "),
  worker: createLogger("[Worker] "),
};
