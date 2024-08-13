import { createLogger, format, transports } from "winston";
import { env } from "./env";

// Custom filter for stdout transport
const filterOnlyInfoAndWarn = format((info) => {
  if (info.level === "error") {
    return false; // Exclude 'error' level logs
  }
  return info;
});

// Custom filter for stderr transport
const filterOnlyErrors = format((info) => {
  if (info.level !== "error") {
    return false; // Exclude non-error level logs
  }
  return info;
});

const colorizeFormat = () => {
  if (env.NODE_ENV === "development") {
    return format.colorize();
  } else {
    return format.uncolorize();
  }
};

const winstonLogger = createLogger({
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    colorizeFormat(),
    format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [
    // Transport for stdout
    new transports.Console({
      format: format.combine(
        filterOnlyInfoAndWarn(),
        format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] ${level}: ${message}`;
        }),
      ),
      stderrLevels: [], // Don't log "error" to stdout
    }),
    // Transport for stderr
    new transports.Console({
      format: format.combine(
        filterOnlyErrors(),
        format.printf(({ level, message, timestamp }) => {
          return `[${timestamp}] ${level}: ${message}`;
        }),
      ),
      stderrLevels: ["error"], // Ensure errors go to stderr
    }),
  ],
});

interface LoggerParams {
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

  if (error) {
    winstonLogger.error(`${prefix}${message}${suffix}`);
  } else {
    winstonLogger.log(level, `${prefix}${message}${suffix}`);
  }
};
