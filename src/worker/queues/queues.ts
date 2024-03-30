import { Transactions, Webhooks } from "@prisma/client";
import { JobsOptions, Queue } from "bullmq";
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
export interface IngestQueueData {
  tx: QueuedTransaction;
}
export const ingestQueue = new Queue<IngestQueueData>("ingest", {
  connection: redis,
  defaultJobOptions,
});

/**
 * Sends webhooks to configured webhook URLs.
 */
export type WebhookQueueData = {
  data: InsertWebhookData;
  webhook: Webhooks;
};

const webhookQueue = new Queue<WebhookQueueData>("webhook", {
  connection: redis,
  defaultJobOptions,
});

export type InsertWebhookData =
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
export const insertWebhookQueue = async (data: InsertWebhookData) => {
  const webhooks = await getAllWebhooks();

  for (const webhook of webhooks) {
    if (!webhook.revokedAt && data.type === webhook.eventType) {
      await webhookQueue.add(`${data.type}:${webhook.id}`, {
        data,
        webhook,
      });
    }
  }
};
