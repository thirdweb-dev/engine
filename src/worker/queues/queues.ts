import type { Job, JobsOptions, Worker } from "bullmq";
import { env } from "../../shared/utils/env.js";
import { logger } from "../../shared/utils/logger.js";

export const defaultJobOptions: JobsOptions = {
  // Does not retry by default. Queues must explicitly define their own retry count and backoff behavior.
  attempts: 0,
  removeOnComplete: {
    age: 7 * 24 * 60 * 60,
    count: env.QUEUE_COMPLETE_HISTORY_COUNT,
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60,
    count: env.QUEUE_FAIL_HISTORY_COUNT,
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
