import { createLogger, format, transports } from "winston";
import { env } from "./env";

type LogLevels = typeof env.LOG_LEVEL;

// Define custom log levels that strictly match the log levels in the env file
const customLevels: {
  levels: { [K in LogLevels]: number };
  colors: { [K in LogLevels]: string };
} = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
  },
  colors: {
    fatal: "red",
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
    trace: "gray",
  },
};

// Custom filter for stdout transport
const filterNonErrors = format((info) => {
  if (info.level === "error" || info.level === "fatal") {
    return false; // only include non-error logs
  }
  return info;
});

// Custom filter for stderr transport
const filterErrorsAndFatal = format((info) => {
  if (info.level === "error" || info.level === "fatal") {
    return info; // only include error and fatal logs
  }
  return false;
});

const colorizeFormat = () => {
  if (env.NODE_ENV === "development") {
    return format.colorize({ colors: customLevels.colors });
  }
    return format.uncolorize();
};

const winstonLogger = createLogger({
  levels: customLevels.levels,
  level: env.LOG_LEVEL,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    colorizeFormat(),
    format.printf(({ level, message, timestamp, error }) => {
      if (error) {
        return `[${timestamp}] ${level}: ${message} - ${error.stack}`;
      }
      return `[${timestamp}] ${level}: ${message}`;
    }),
  ),
  transports: [
    // Transport for stdout (non-error logs)
    new transports.Console({
      format: format.combine(filterNonErrors()),
    }),
    // Transport for stderr (error and fatal logs)
    new transports.Console({
      format: format.combine(filterErrorsAndFatal()),
      stderrLevels: ["error", "fatal"],
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

  let suffix = "";
  if (data) {
    suffix += ` - ${JSON.stringify(data)}`;
  }

  if (error) {
    winstonLogger.error(level, `${prefix}${message}${suffix}`, { error });
  } else {
    winstonLogger.log(level, `${prefix}${message}${suffix}`);
  }
};
