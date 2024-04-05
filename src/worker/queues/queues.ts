import { Transactions, Webhooks } from "@prisma/client";
import { JobsOptions, Queue } from "bullmq";
import superjson from "superjson";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { QueuedTransaction } from "../../schema/transaction";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { TransactionStatus } from "../../server/schemas/transaction";
import { redis } from "../../utils/redis/redis";

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  // Retries after 5s, 10s, 20s.
  backoff: { type: "exponential", delay: 5_000 },
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
export interface IngestJob {
  tx: QueuedTransaction;
}
export class IngestQueue {
  private static q = new Queue<string>("ingest", {
    connection: redis,
    defaultJobOptions,
  });

  static add = async (data: IngestJob) => {
    const serialized = superjson.stringify(data);
    await this.q.add(data.tx.idempotencyKey, serialized, {
      jobId: data.tx.idempotencyKey,
    });
  };
}

/**
 * Sends webhooks to configured webhook URLs.
 */
export type EnqueueWebhookData =
  | {
      type: WebhooksEventTypes.ALL_TRANSACTIONS;
      status: TransactionStatus;
      tx: Transactions;
    }
  | {
      type: WebhooksEventTypes.BACKEND_WALLET_BALANCE;
      walletAddress: string;
      minimumBalance: string;
      currentBalance: string;
      chainId: number;
      message: string;
    };
export interface WebhookJob {
  data: EnqueueWebhookData;
  webhook: Webhooks;
}

export class WebhookQueue {
  private static q = new Queue<string>("webhook", {
    connection: redis,
    defaultJobOptions,
  });

  static add = async (data: EnqueueWebhookData) => {
    const webhooks = await getAllWebhooks();

    for (const webhook of webhooks) {
      if (!webhook.revokedAt && data.type === webhook.eventType) {
        const job: WebhookJob = { data, webhook };
        const serialized = superjson.stringify(job);
        await this.q.add(`${data.type}:${webhook.id}`, serialized);
      }
    }
  };
}
