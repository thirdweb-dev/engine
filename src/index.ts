import "./polyfill";
import {initServer} from "./server";
import {env} from "./utils/env";
import {logger} from "./utils/logger";
import './utils/tracer';
import {initWorker} from "./worker";

const main = async () => {
  if (env.ENGINE_MODE === "server_only") {
    initServer();
  } else if (env.ENGINE_MODE === "worker_only") {
    initWorker();
  } else {
    initServer();
    initWorker();
  }
};

main();

// Adding handlers for `uncaughtException` & `unhandledRejection`
// Needs to be root level of your application to ensure it
// catches any unhandledRejections or uncaughtException that occur throughout
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
