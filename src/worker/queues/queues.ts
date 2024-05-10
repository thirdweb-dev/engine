import {
  ContractEventLogs,
  ContractTransactionReceipts,
  Webhooks,
} from "@prisma/client";
import { JobsOptions, Queue } from "bullmq";
import superjson from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { logger } from "../../utils/logger";
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
 * Sends webhooks to configured webhook URLs.
 */
export type EnqueueContractSubscriptionWebhookData = {
  type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION;
  webhook: Webhooks;
  eventLog?: ContractEventLogs;
  transactionReceipt?: ContractTransactionReceipts;
};
// TODO: Add other webhook event types here.
export type EnqueueWebhookData = EnqueueContractSubscriptionWebhookData;

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
    switch (data.type) {
      case WebhooksEventTypes.CONTRACT_SUBSCRIPTION:
        return this.enqueueContractSubscriptionWebhook(data);
      default:
        logger({
          service: "worker",
          level: "warn",
          message: `Unexpected webhook type: ${data.type}`,
        });
    }
  };

  private static enqueueContractSubscriptionWebhook = async (
    data: EnqueueContractSubscriptionWebhookData,
  ) => {
    const { type, webhook, eventLog, transactionReceipt } = data;
    if (!eventLog || !transactionReceipt) {
      throw 'Must provide "eventLog" or "transactionReceipt".';
    }

    if (!webhook.revokedAt && type === webhook.eventType) {
      const job: WebhookJob = { data, webhook };
      const serialized = superjson.stringify(job);
      await this.q.add(`${data.type}:${webhook.id}`, serialized);
    }
  };
}
