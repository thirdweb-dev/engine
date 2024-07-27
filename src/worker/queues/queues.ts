import { Job, JobsOptions, Worker } from "bullmq";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  // Retries after 5s, 10s, 20s.
  backoff: { type: "exponential", delay: 5_000 },
  // Purges completed jobs.
  removeOnComplete: {
    age: 60 * 60 * 24 * 7,
    count: 10_000,
  },
};

export const logWorkerExceptions = (worker: Worker) => {
  worker.on("failed", (job: Job | undefined, err: Error) => {
    if (!job) {
      return;
    }

    job.log(`Job failed: ${err.message}`);
    logger({
      level: "error",
      message: `[${worker.name}] Job failed. jobId="${job.id}" data="${
        job.data
      }", error="${err.message}" ${
        env.NODE_ENV === "development" ? err.stack : ""
      }`,
      service: "worker",
    });
  });
};
