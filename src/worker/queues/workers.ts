import { Job, Worker } from "bullmq";
import { logger } from "../../utils/logger";

export const logWorkerEvents = (worker: Worker) => {
  worker.on("active", (job: Job) => {
    logger({
      level: "debug",
      message: `Processing job ${job.id}`,
      service: "worker",
    });
  });
  worker.on("completed", (job: Job) => {
    logger({
      level: "debug",
      message: `[${worker.name}] Job ${job.id} has completed!`,
      service: "worker",
    });
  });
  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger({
      level: "error",
      message: `[${worker.name}]  Job ${job?.id ?? "?"} has failed with ${
        err.message
      }`,
      service: "worker",
    });
  });
};
