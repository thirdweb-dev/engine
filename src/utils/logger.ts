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
  level: env.LOG_LEVEL,
};

const pino = Pino(defaultOptions);

export interface LoggerParams {
  service: (typeof env)["LOG_SERVICES"][0];
  level: (typeof env)["LOG_LEVEL"];
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
  if (!env.LOG_SERVICES.includes(service)) {
    return;
  }

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
