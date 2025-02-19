import {
  type Logger,
  type LoggerOptions,
  createLogger,
  format,
  transports,
} from "winston";
import { env } from "./env";

const metadataFormatter = format((meta) => {
  if (!meta[Symbol.for("splat")]) {
    meta[Symbol.for("splat")] = [];
  }
  const customMetadata: { [key: string]: unknown } = {};
  let error: Error | undefined;
  for (const el of meta[Symbol.for("splat")] as unknown[]) {
    if (!el) {
      continue;
    }
    if (el instanceof Error && !error) {
      error = el;
    } else {
      for (const [key, val] of Object.entries(el)) {
        customMetadata[key] = val;
      }
    }
  }
  const errorMetadata: Record<string, string> = {};
  if (error?.stack) {
    errorMetadata.stack = error.stack;
  }

  return { ...meta, ...customMetadata, ...errorMetadata };
});

const getLocalhostOptions = (loggerName: string): LoggerOptions => {
  const prettyfiedLog = format.printf((info) => {
    const correlationId = info?.correlationId
      ? `{correlation-id: ${info.correlationId}}`
      : "";
    return `[${info.context ?? loggerName}] ${correlationId} ${info.level}: ${
      info.message || ""
    } ${info.stack || ""}`;
  });

  return {
    level: "http",
    format: format.combine(
      metadataFormatter(),
      format.errors({ stack: true }),
      format.colorize(),
      prettyfiedLog,
    ),
    transports: [new transports.Console()],
    exceptionHandlers: [new transports.Console()],
    rejectionHandlers: [new transports.Console()],
  };
};

const getProductionOptions = (loggerName: string): LoggerOptions => {
  return {
    level: env.LOG_LEVEL,
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,

    defaultMeta: {
      component: loggerName,
      service: process.env.DD_SERVICE,
      ...metadataFormatter(),
    },
    format: format.combine(
      format.errors({ stack: true }),
      format((info) => {
        const { correlationId, ...rest } = info;
        return {
          ...rest,
          ...(correlationId ? { correlationId } : {}),
        };
      })(),
      format.json(),
    ),
    transports: [new transports.Console()],
    exceptionHandlers: [new transports.Console()],
    rejectionHandlers: [new transports.Console()],
  };
};

const initializeBaseLogger = (name: string): Logger => {
  const isLocalhost =
    (!process.env.DD_TRACER_ACTIVATED || !process.env.ZEET_PROJECT_NAME) &&
    (env.NODE_ENV === "local" || env.NODE_ENV === "development");
  const options = isLocalhost
    ? getLocalhostOptions(name)
    : getProductionOptions(name);
  return createLogger(options);
};

export const defaultLogger = initializeBaseLogger("default");

export const initializeLogger = (name: string): Logger => {
  return defaultLogger.child({ context: name });
};
