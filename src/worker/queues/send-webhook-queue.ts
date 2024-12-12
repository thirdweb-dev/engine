import type {
  ContractEventLogs,
  ContractTransactionReceipts,
  Webhooks,
} from "@prisma/client";
import { Queue } from "bullmq";
import SuperJSON from "superjson";
import {
  WebhooksEventTypes,
  type BackendWalletBalanceWebhookParams,
} from "../../shared/schemas/webhooks";
import { getWebhooksByEventType } from "../../shared/utils/cache/get-webhook";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import { defaultJobOptions } from "./queues";

export type EnqueueContractSubscriptionWebhookData = {
  type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION;
  webhook: Webhooks;
  eventLog?: ContractEventLogs;
  transactionReceipt?: ContractTransactionReceipts;
};

export type EnqueueTransactionWebhookData = {
  type:
    | WebhooksEventTypes.SENT_TX
    | WebhooksEventTypes.MINED_TX
    | WebhooksEventTypes.ERRORED_TX
    | WebhooksEventTypes.CANCELLED_TX;
  queueId: string;
};

export type EnqueueLowBalanceWebhookData = {
  type: WebhooksEventTypes.BACKEND_WALLET_BALANCE;
  body: BackendWalletBalanceWebhookParams;
};

// Add other webhook event types here.
type EnqueueWebhookData =
  | EnqueueContractSubscriptionWebhookData
  | EnqueueTransactionWebhookData
  | EnqueueLowBalanceWebhookData;

export interface WebhookJob {
  data: EnqueueWebhookData;
  webhook: Webhooks;
}

export class SendWebhookQueue {
  static q = new Queue<string>("send-webhook", {
    connection: redis,
    defaultJobOptions: {
      ...defaultJobOptions,
      attempts: 3,
      backoff: { type: "exponential", delay: 5_000 },
    },
  });

  static enqueueWebhook = async (data: EnqueueWebhookData) => {
    switch (data.type) {
      case WebhooksEventTypes.CONTRACT_SUBSCRIPTION:
        return this._enqueueContractSubscriptionWebhook(data);
      case WebhooksEventTypes.SENT_TX:
      case WebhooksEventTypes.MINED_TX:
      case WebhooksEventTypes.ERRORED_TX:
      case WebhooksEventTypes.CANCELLED_TX:
        return this._enqueueTransactionWebhook(data);
      case WebhooksEventTypes.BACKEND_WALLET_BALANCE:
        return this._enqueueBackendWalletBalanceWebhook(data);
      default:
        logger({
          service: "worker",
          level: "warn",
          message: `Unexpected webhook type: ${(data as { type: unknown }).type}`,
        });
    }
  };

  /**
   * Contract Subscriptions webhooks
   */
  private static _enqueueContractSubscriptionWebhook = async (
    data: EnqueueContractSubscriptionWebhookData,
  ) => {
    const { type, webhook, eventLog, transactionReceipt } = data;
    if (!eventLog && !transactionReceipt) {
      throw 'Must provide "eventLog" or "transactionReceipt".';
    }

    if (!webhook.revokedAt && type === webhook.eventType) {
      const job: WebhookJob = { data, webhook };
      const serialized = SuperJSON.stringify(job);
      const idempotencyKey = this._getContractSubscriptionWebhookIdempotencyKey(
        {
          webhook,
          eventLog,
          transactionReceipt,
        },
      );
      await this.q.add(`${data.type}:${webhook.id}`, serialized, {
        jobId: idempotencyKey,
      });
    }
  };

  /**
   * Define an idempotency key that ensures a webhook URL will
   * receive an event log or transaction receipt at most once.
   */
  private static _getContractSubscriptionWebhookIdempotencyKey = (args: {
    webhook: Webhooks;
    eventLog?: ContractEventLogs;
    transactionReceipt?: ContractTransactionReceipts;
  }) => {
    const { webhook, eventLog, transactionReceipt } = args;

    if (eventLog) {
      return `${webhook.url}.${eventLog.transactionHash}.${eventLog.logIndex}`;
    }
    if (transactionReceipt) {
      return `${webhook.url}.${transactionReceipt.transactionHash}`;
    }
    throw 'Must provide "eventLog" or "transactionReceipt".';
  };

  /**
   * Transaction webhooks
   */
  static _enqueueTransactionWebhook = async (
    data: EnqueueTransactionWebhookData,
  ) => {
    const webhooks = [
      ...(await getWebhooksByEventType(WebhooksEventTypes.ALL_TX)),
      ...(await getWebhooksByEventType(data.type)),
    ];

    for (const webhook of webhooks) {
      const job: WebhookJob = { data, webhook };
      const serialized = SuperJSON.stringify(job);
      await this.q.add(`${data.type}:${webhook.id}`, serialized, {
        jobId: this._getTransactionWebhookIdempotencyKey({
          webhook,
          eventType: data.type,
          queueId: data.queueId,
        }),
      });
    }
  };

  private static _getTransactionWebhookIdempotencyKey = (args: {
    webhook: Webhooks;
    eventType: WebhooksEventTypes;
    queueId: string;
  }) => `${args.webhook.url}.${args.eventType}.${args.queueId}`;

  private static _enqueueBackendWalletBalanceWebhook = async (
    data: EnqueueLowBalanceWebhookData,
  ) => {
    const webhooks = await getWebhooksByEventType(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );
    for (const webhook of webhooks) {
      const job: WebhookJob = { data, webhook };
      const serialized = SuperJSON.stringify(job);
      await this.q.add(
        `${data.type}:${data.body.chainId}:${data.body.walletAddress}`,
        serialized,
      );
    }
  };
}
