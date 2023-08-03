import { PinoLoggerOptions } from "fastify/types/logger";
import { env } from "../env";

const pinoLogOptions: PinoLoggerOptions = {
  redact: ["headers.authorization"],
  transport: {
    target: "pino-pretty",
    options: {
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname,reqId",
      singleLine: true,
    },
  },
};

export const getLogSettings = (msgPrefix: string): PinoLoggerOptions => {
  if (env.NODE_ENV === "production") {
    pinoLogOptions.level = "info";
  } else if (env.NODE_ENV === "development") {
    pinoLogOptions.level = "debug";
  } else if (env.NODE_ENV === "testing") {
    pinoLogOptions.level = "debug";
  } else {
    pinoLogOptions.level = "trace";
  }

  pinoLogOptions.msgPrefix = `[${msgPrefix}]: `;
  return pinoLogOptions;
};
