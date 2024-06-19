import {
  ContractEventLogs,
  ContractTransactionReceipts,
  Transactions,
  Webhooks,
} from "@prisma/client";
import { Queue } from "bullmq";
import SuperJSON from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { getWebhooksByEventType } from "../../utils/cache/getWebhook";
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

export type EnqueueTransactionWebhookData = {
  type:
    | WebhooksEventTypes.ALL_TX
    | WebhooksEventTypes.QUEUED_TX
    | WebhooksEventTypes.SENT_TX
    | WebhooksEventTypes.MINED_TX
    | WebhooksEventTypes.ERRORED_TX
    | WebhooksEventTypes.CANCELLED_TX;
  transaction: Transactions;
};

// TODO: Add other webhook event types here.
type EnqueueWebhookData =
  | EnqueueContractSubscriptionWebhookData
  | EnqueueTransactionWebhookData;

export interface WebhookJob {
  data: EnqueueWebhookData;
  webhook: Webhooks;
}

export const enqueueWebhook = async (data: EnqueueWebhookData) => {
  switch (data.type) {
    case WebhooksEventTypes.CONTRACT_SUBSCRIPTION:
      return enqueueContractSubscriptionWebhook(data);
    case WebhooksEventTypes.ALL_TX:
    case WebhooksEventTypes.QUEUED_TX:
    case WebhooksEventTypes.SENT_TX:
    case WebhooksEventTypes.MINED_TX:
    case WebhooksEventTypes.ERRORED_TX:
    case WebhooksEventTypes.CANCELLED_TX:
      return enqueueTransactionWebhook(data);
    default:
      logger({
        service: "worker",
        level: "warn",
        message: `Unexpected webhook type: ${(data as any).type}`,
      });
  }
};

/**
 * Contract Subscriptions webhooks
 */

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

/**
 * Transaction webhooks
 */

const enqueueTransactionWebhook = async (
  data: EnqueueTransactionWebhookData,
) => {
  if (!_queue) return;

  const webhooks = [
    ...(await getWebhooksByEventType(WebhooksEventTypes.ALL_TX)),
    ...(await getWebhooksByEventType(data.type)),
  ];

  for (const webhook of webhooks) {
    const job: WebhookJob = { data, webhook };
    const serialized = SuperJSON.stringify(job);
    await _queue.add(`${data.type}:${webhook.id}`, serialized, {
      jobId: getTransactionWebhookIdempotencyKey({
        webhook,
        eventType: data.type,
        queueId: data.transaction.id,
      }),
    });
  }
};

const getTransactionWebhookIdempotencyKey = (args: {
  webhook: Webhooks;
  eventType: WebhooksEventTypes;
  queueId: string;
}) => `${args.webhook.url}:${args.eventType}:${args.queueId}`;
