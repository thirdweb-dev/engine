import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export type MineTransactionData = {
  queueId: string;
};

export class MineTransactionQueue {
  public static name = "transactions-2-mine";

  private static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      // Delay confirming the tx by 500ms.
      delay: 500,
      // Check in 5s, 10s, 20s, 40s, 80s, 160s, 320s, 640s, 1280s, 2560s (~45 minutes)
      // This needs to be long enough to handle transactions stuck in mempool for a while.
      attempts: 10,
      backoff: { type: "exponential", delay: 5_000 },
    },
  });

  // There must be a worker to poll the result for every transaction hash,
  // even for the same queueId. This handles if any retried transactions succeed.
  private static _jobId = (data: MineTransactionData) => data.queueId;

  static add = async (data: MineTransactionData) => {
    const serialized = superjson.stringify(data);
    const jobId = this._jobId(data);
    await this.q.add(jobId, serialized, { jobId });
  };

  static length = async () => this.q.getWaitingCount();
}
