import {
  ContractEventLogs,
  ContractTransactionReceipts,
  Webhooks,
} from "@prisma/client";
import { Queue } from "bullmq";
import SuperJSON from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { defaultJobOptions } from "./queues";

export const SEND_WEBHOOK_QUEUE_NAME = "send-webhook";

// Queue
const _queue = redis
  ? new Queue<string>(SEND_WEBHOOK_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions,
    })
  : null;

export type EnqueueContractSubscriptionWebhookData = {
  type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION;
  webhook: Webhooks;
  eventLog?: ContractEventLogs;
  transactionReceipt?: ContractTransactionReceipts;
};
// TODO: Add other webhook event types here.
type EnqueueWebhookData = EnqueueContractSubscriptionWebhookData;

export interface WebhookJob {
  data: EnqueueWebhookData;
  webhook: Webhooks;
}

export const enqueueWebhook = async (data: EnqueueWebhookData) => {
  switch (data.type) {
    case WebhooksEventTypes.CONTRACT_SUBSCRIPTION:
      return enqueueContractSubscriptionWebhook(data);
    default:
      logger({
        service: "worker",
        level: "warn",
        message: `Unexpected webhook type: ${data.type}`,
      });
  }
};

const enqueueContractSubscriptionWebhook = async (
  data: EnqueueContractSubscriptionWebhookData,
) => {
  if (!_queue) return;
  const { type, webhook, eventLog, transactionReceipt } = data;
  if (!eventLog && !transactionReceipt) {
    throw 'Must provide "eventLog" or "transactionReceipt".';
  }

  if (!webhook.revokedAt && type === webhook.eventType) {
    const job: WebhookJob = { data, webhook };
    const serialized = SuperJSON.stringify(job);
    const idempotencyKey = getContractSubscriptionWebhookIdempotencyKey({
      webhook,
      eventLog,
      transactionReceipt,
    });
    await _queue.add(`${data.type}:${webhook.id}`, serialized, {
      jobId: idempotencyKey,
    });
  }
};

/**
 * Define an idempotency key that ensures a webhook URL will
 * receive an event log or transaction receipt at most once.
 */
const getContractSubscriptionWebhookIdempotencyKey = (args: {
  webhook: Webhooks;
  eventLog?: ContractEventLogs;
  transactionReceipt?: ContractTransactionReceipts;
}) => {
  const { webhook, eventLog, transactionReceipt } = args;

  if (eventLog) {
    return `${webhook.url}:${eventLog.transactionHash}:${eventLog.logIndex}`;
  } else if (transactionReceipt) {
    return `${webhook.url}:${transactionReceipt.transactionHash}`;
  }
  throw 'Must provide "eventLog" or "transactionReceipt".';
};
