import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export type MineTransactionData = {
  queueId: string;
};

export class MineTransactionQueue {
  static q = new Queue<string>("transactions-2-mine", {
    connection: redis,
    // Backoff strategy is defined on the worker (`BackeoffStrategy`) and when adding to the queue (`attempts`).
    defaultJobOptions,
  });

  // There must be a worker to poll the result for every transaction hash,
  // even for the same queueId. This handles if any retried transactions succeed.
  static jobId = (data: MineTransactionData) => `mine.${data.queueId}`;

  static add = async (data: MineTransactionData) => {
    const serialized = superjson.stringify(data);
    const jobId = this.jobId(data);
    await this.q.add(jobId, serialized, {
      jobId,
      attempts: 200, // > 30 minutes with the backoffStrategy defined on the worker
      backoff: { type: "custom" },
    });
  };

  static length = async () => this.q.getWaitingCount();
}
