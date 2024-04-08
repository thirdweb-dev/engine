import { Transactions, Webhooks } from "@prisma/client";
import { JobsOptions, Queue } from "bullmq";
import superjson from "superjson";
import { getAllWebhooks } from "../../db/webhooks/getAllWebhooks";
import { QueuedTransaction, SentTransaction } from "../../schema/transaction";
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

/**
 * Ingests write transaction requests.
 */
export interface QueuedTransactionJob {
  queuedTransaction: QueuedTransaction;
}

export class QueuedTransactionQueue {
  static name = "queuedTransaction";

  private static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions,
  });

  static add = async (data: QueuedTransactionJob) => {
    const serialized = superjson.stringify(data);
    await this.q.add(data.queuedTransaction.id, serialized, {
      jobId: data.queuedTransaction.idempotencyKey,
    });
  };
}

/**
 * Polls sent transactions to confirm or retry them.
 */
export interface SentTransactionJob {
  sentTransaction: SentTransaction;
}

export class SentTransactionQueue {
  static name = "sentTransaction";

  // Retry every 2 seconds up to 1 hour.
  private static RETRY_DURATION_SECONDS = 60 * 60;
  private static RETRY_INTERVAL_SECONDS = 2;

  private static q = new Queue<string>(this.name, {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      backoff: this.RETRY_INTERVAL_SECONDS * 1000,
      attempts: this.RETRY_DURATION_SECONDS / this.RETRY_INTERVAL_SECONDS,
      // Wait 500ms before polling the transaction onchain status.
      delay: 500,
    },
  });

  static add = async (data: SentTransactionJob) => {
    const serialized = superjson.stringify(data);
    await this.q.add(data.sentTransaction.id, serialized);
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
  static name = "webhook";

  private static q = new Queue<string>(this.name, {
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
