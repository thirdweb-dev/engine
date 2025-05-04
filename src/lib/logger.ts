import {
  type Logger,
  type LoggerOptions,
  createLogger,
  format,
  transports,
} from "winston";
import { env } from "./env.js";

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
    // Extract correlation ID if present
    const correlationId = info?.correlationId
      ? `{correlation-id: ${info.correlationId}}`
      : "";

    // Standard fields that we'll exclude from metadata display
    const standardFields = [
      "message",
      "level",
      "context",
      "correlationId",
      "stack",
      "level",
      "ms",
      "service",
      "timestamp",
      "component",
    ];

    // Build metadata object with non-standard fields only
    const metadata: Record<string, unknown> = {};
    Object.keys(info).forEach((key) => {
      if (!standardFields.includes(key)) {
        metadata[key] = info[key];
      }
    });

    // Convert remaining metadata to JSON string if there's anything left
    const metadataStr =
      Object.keys(metadata).length > 0
        ? `\n${JSON.stringify(
            metadata,
            (_, value) => {
              // Handle circular references or complex objects
              if (value instanceof Error) {
                return {
                  message: value.message,
                  name: value.name,
                  stack: value.stack,
                };
              }
              return value;
            },
            2,
          )}`
        : "";

    // Return formatted log with metadata appended
    return `[${info.context ?? loggerName}] ${correlationId} ${info.level}: ${
      info.message || ""
    } ${info.stack || ""}${metadataStr}`;
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
