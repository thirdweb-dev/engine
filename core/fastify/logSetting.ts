import { getEnv } from "../loadEnv";
import { PinoLoggerOptions } from "fastify/types/logger";

const pinoLogOptions: PinoLoggerOptions = {
  redact: ["headers.authorization"],
  level: "debug",
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname,reqId",
      singleLine: true,
    },
  },
  msgPrefix: "API-Server",
};

export const getLogSettings = (msgPrefix: string = "API-Server"): PinoLoggerOptions => {
  if (getEnv("NODE_ENV") === "production") {
    pinoLogOptions.level = "info";
  } else if (getEnv("NODE_ENV") === "development") {
    pinoLogOptions.level = "debug";
  } else {
    pinoLogOptions.level = "trace";
  }

  pinoLogOptions.msgPrefix = `[${msgPrefix}]: `;
  return pinoLogOptions;
};