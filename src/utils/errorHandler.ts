import { LoggerParams, logger } from "./logger";

export const handleUncaughtExceptions = (service: LoggerParams["service"]) => {
  process.on("uncaughtException", (err) => {
    logger({
      service,
      level: "fatal",
      message: "Uncaught Exception thrown",
      error: err,
    });
  });
};

export const handleUncaughtRejections = (service: LoggerParams["service"]) => {
  process.on("unhandledRejection", (reason, promise) => {
    logger({
      service,
      level: "error",
      message: "Unhandled Rejection at:",
      error: reason,
    });
  });
};
