import { Job, Worker } from "bullmq";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const logWorkerEvents = (worker: Worker) => {
  worker.on("active", (job: Job) => {
    logger({
      level: "debug",
      message: `[${worker.name}] Processing: ${job.id}`,
      service: "worker",
    });
  });
  worker.on("completed", (job: Job) => {
    logger({
      level: "debug",
      message: `[${worker.name}] Completed: ${job.id}`,
      service: "worker",
    });
  });
  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger({
      level: "error",
      message: `[${worker.name}] Failed: ${
        job?.id ?? "<no job ID>"
      } with error: ${err.message} ${
        env.NODE_ENV === "development" ? err.stack : ""
      }`,
      service: "worker",
    });
  });
};
