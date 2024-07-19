import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export type CancelTransactionData = {
  queueId: string;
};

export class CancelTransactionQueue {
  public static name = "transactions-3-cancel";

  private static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 10,
    },
  });

  static add = async (data: CancelTransactionData) => {
    const serialized = superjson.stringify(data);
    await this.q.add(data.queueId, serialized, {
      // No jobId. The same job may be enqueued to cancel different transaction hashes.
    });
  };

  static length = async () => this.q.getWaitingCount();
}
