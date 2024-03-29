import { JobsOptions, Queue } from "bullmq";
import { TransactionStatus } from "../../server/schemas/transaction";
import { redis } from "./redis";

const defaultJobOptions: JobsOptions = {
  // Purges completed jobs past 500 or 2 days.
  removeOnComplete: {
    age: 60 * 60 * 24 * 2,
    count: 500,
  },
};

export type QueueType = "ingest" | "webhook";

/**
 * Processes write transaction requests.
 */
export interface IngestQueueData {}
export const ingestQueue = new Queue<IngestQueueData>("ingest", {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 3,
    // Retries after 10s, 20s, 30s.
    backoff: 10,
  },
});

/**
 * Sends webhooks to configured webhook URLs.
 */
export interface WebhookQueueData {
  id: string;
  data: any;
  status: TransactionStatus;
}
export const webhookQueue = new Queue<WebhookQueueData>("webhook", {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    // Retries after 5s, 10s, 20s, 40s, 80s.
    backoff: { type: "exponential", delay: 5_000 },
  },
});
