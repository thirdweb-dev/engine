import { initServer } from "./server";
import { logger } from "./utils/logger";
import { initWorker } from "./worker";

const main = async () => {
  initServer();
  initWorker();
};

main();

process.on("unhandledRejection", (err) => {
  logger({
    service: "server",
    level: "error",
    message: "Unhandled Rejection",
    error: err,
  });
});

process.on("uncaughtException", (err) => {
  logger({
    service: "server",
    level: "error",
    message: "uncaught exception",
    error: err,
  });
});
