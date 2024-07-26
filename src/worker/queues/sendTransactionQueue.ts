import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export type SendTransactionData = {
  queueId: string;
  resendCount: number;
};

export class SendTransactionQueue {
  public static name = "transactions-1-send";

  private static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
    },
  });

  // Allow enqueing the same queueId for multiple retries.
  private static _jobId = (data: SendTransactionData) =>
    `${data.queueId}:${data.resendCount}`;

  static add = async (data: SendTransactionData) => {
    const serialized = superjson.stringify(data);
    const jobId = this._jobId(data);
    await this.q.add(jobId, serialized, { jobId });
  };

  static remove = async (data: SendTransactionData) => {
    try {
      await this.q.remove(this._jobId(data));
    } catch (e) {
      // Job is currently running.
    }
  };

  static length = async () => this.q.getWaitingCount();
}
