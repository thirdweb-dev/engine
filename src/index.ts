import "./polyfill";
import { initServer } from "./server";
import { logger } from "./utils/logger";
import { initWorker } from "./worker";

const main = async () => {
  initServer();
  initWorker();
};

main();

// Adding handlers for `uncaughtException` & `unhandledRejection`
// Needs to be root level of your application to ensure it
// catches any unhandled exceptions that occur throughout
// entire codebase

process.on("uncaughtException", (err) => {
  logger({
    message: "Uncaught Exception",
    service: "server",
    level: "error",
    error: err,
  });
});

process.on("unhandledRejection", (err) => {
  logger({
    message: "Unhandled Rejection",
    service: "server",
    level: "error",
    error: err,
  });
});
