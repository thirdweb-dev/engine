import { Job, Worker } from "bullmq";
import { bullMQConnection, webhookQueue } from "../../db/client";
import { RedisTxInput } from "../../db/transactions/queueTx";
import { logger } from "../../utils/logger";

// Worker processing logic
export const processRawRequest = async () => {
  const myWorker = new Worker(
    "rawRequestQueue",
    async (job: Job) => {
      const rawRequest = job.data as RedisTxInput;
      logger({
        level: "info",
        message: `Processing job ${job.id} ${JSON.stringify(rawRequest)}`,
        service: "worker",
      });

      webhookQueue.add("webhookQueue", rawRequest);
    },
    bullMQConnection,
  );

  myWorker.on("completed", (job: Job) => {
    logger({
      level: "info",
      message: `[processRawRequest] Job ${job.id} has completed!`,
      service: "worker",
    });
  });

  myWorker.on(
    "failed",
    (job: Job<any, any, string> | undefined, err: Error) => {
      if (job) {
        logger({
          level: "error",
          message: `[processRawRequest]  Job ${job.id} has failed with ${err.message}`,
          service: "worker",
        });
      } else {
        logger({
          level: "error",
          message: `[processRawRequest]  Job is undefined. Error: ${err.message}`,
          service: "worker",
        });
      }
    },
  );
};
