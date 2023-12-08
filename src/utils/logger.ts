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

const pino = Pino(defaultOptions);

interface LoggerParams {
  service: "server" | "worker";
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  queueId?: string | null;
  error?: any;
  data?: any;
}

export const logger = ({
  service,
  level,
  queueId,
  message,
  error,
  data,
}: LoggerParams) => {
  let prefix = `[${service.charAt(0).toUpperCase() + service.slice(1)}] `;
  if (queueId) {
    prefix += `[Transaction] [${queueId}] `;
  }

  let suffix = ``;
  if (data) {
    suffix += ` - ${JSON.stringify(data)}`;
  }
  if (error) {
    suffix += ` - ${error?.message || error}`;
  }

  return pino[level](`${prefix}${message}${suffix}`);
};
