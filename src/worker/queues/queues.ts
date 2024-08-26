import { Job, JobsOptions, Worker } from "bullmq";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const defaultJobOptions: JobsOptions = {
  // Does not retry by default. Queues must explicitly define their own retry count and backoff behavior.
  attempts: 0,
  // Purges successful jobs.
  removeOnComplete: {
    age: 7 * 24 * 60 * 60,
    count: 10_000,
  },
  // Purge failed jobs.
  // These limits are higher to debug or retry failed jobs.
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: 50_000,
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
