import { Queue } from "bullmq";
import superjson from "superjson";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";
import type { EnclaveWalletParams } from "../../shared/utils/cache/get-enclave-wallet";

export type SendTransactionData = {
  queueId: string;
  resendCount: number;
  enclave?: EnclaveWalletParams;
};

export class SendTransactionQueue {
  static q = new Queue<string>("transactions-1-send", {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 5,
      // Retries in: 1s, 2s, 4s, 8s, 16s
      backoff: { type: "exponential", delay: 1_000 },
    },
  });

  // Allow enqueuing the same queueId for multiple retries.
  static jobId = (data: SendTransactionData) =>
    `${data.queueId}.${data.resendCount}`;

  static add = async (data: SendTransactionData) => {
    const serialized = superjson.stringify(data);
    const jobId = this.jobId(data);
    await this.q.add(jobId, serialized, { jobId });
  };

  static remove = async (data: SendTransactionData) => {
    try {
      await this.q.remove(this.jobId(data));
    } catch (_e) {
      // Job is currently running.
    }
  };

  static length = async () => this.q.getWaitingCount();
}
