import { Job, JobsOptions, Worker } from "bullmq";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  // Retries after 5s, 10s, 20s.
  backoff: { type: "exponential", delay: 5_000 },
  // Purges completed jobs past 500 or 5 days.
  removeOnComplete: {
    age: 60 * 60 * 24 * 5,
    count: 500,
  },
};

export const logWorkerEvents = (worker: Worker) => {
  worker.on("failed", (job: Job | undefined, err: Error) => {
    logger({
      level: "error",
      message: `[${worker.name}] Failed: ${
        job?.id ?? "<no job ID>"
      } , Job Data: ${job?.data}, with error: ${err.message} ${
        env.NODE_ENV === "development" ? err.stack : ""
      }`,
      service: "worker",
    });
  });
};
