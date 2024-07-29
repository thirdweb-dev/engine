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
      // Retry after 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s, 1024s (17 minutes)
      // This needs to be long enough to handle transactions stuck in mempool.
      // @TODO: This can be more optimized based on the chain block time.
      attempts: 10,
      backoff: { type: "exponential", delay: 2_000 },
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
