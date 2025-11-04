import type { Static } from "@sinclair/typebox";
import { Worker, type Job, type Processor } from "bullmq";
import superjson from "superjson";
import { TransactionDB } from "../../shared/db/transactions/db";
import {
  WebhooksEventTypes,
  type BackendWalletBalanceWebhookParams,
  type WalletSubscriptionWebhookParams,
} from "../../shared/schemas/webhooks";
import { toEventLogSchema } from "../../server/schemas/event-log";
import {
  toTransactionSchema,
  type TransactionSchema,
} from "../../server/schemas/transaction";
import { toTransactionReceiptSchema } from "../../server/schemas/transaction-receipt";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import {
  sendWebhookRequest,
  type WebhookResponse,
} from "../../shared/utils/webhook";
import {
  SendWebhookQueue,
  type WebhookJob,
} from "../queues/send-webhook-queue";
import { env } from "../../shared/utils/env";

const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const { data, webhook } = superjson.parse<WebhookJob>(job.data);

  // Extract transaction ID if available
  let transactionId: string | undefined;
  if ("queueId" in data) {
    transactionId = data.queueId;
  }

  // Log webhook attempt with HMAC info
  const hmacMode = env.ENABLE_CUSTOM_HMAC_AUTH ? "custom" : "standard";
  logger({
    service: "worker",
    level: "info",
    message: `[Webhook] Attempting to send webhook for transaction ${transactionId} at destination ${webhook.url}`,
    queueId: transactionId,
    data: {
      eventType: data.type,
      destination: webhook.url,
      webhookId: webhook.id,
      hmacMode,
    },
  });

  let resp: WebhookResponse | undefined;
  switch (data.type) {
    case WebhooksEventTypes.CONTRACT_SUBSCRIPTION: {
      let webhookBody: {
        type: "event-log" | "transaction-receipt";
        data: unknown;
      };
      if (data.eventLog) {
        webhookBody = {
          type: "event-log",
          data: toEventLogSchema(data.eventLog),
        };
      } else if (data.transactionReceipt) {
        webhookBody = {
          type: "transaction-receipt",
          data: toTransactionReceiptSchema(data.transactionReceipt),
        };
      } else {
        throw new Error(
          'Missing "eventLog" or "transactionReceipt" for CONTRACT_SUBSCRIPTION webhook.',
        );
      }
      resp = await sendWebhookRequest(webhook, webhookBody);
      break;
    }

    case WebhooksEventTypes.SENT_TX:
    case WebhooksEventTypes.MINED_TX:
    case WebhooksEventTypes.ERRORED_TX:
    case WebhooksEventTypes.CANCELLED_TX: {
      const transaction = await TransactionDB.get(data.queueId);
      if (!transaction) {
        job.log("Transaction not found.");
        logger({
          service: "worker",
          level: "warn",
          message: `[Webhook] Transaction not found for webhook`,
          queueId: data.queueId,
          data: {
            eventType: data.type,
            destination: webhook.url,
            webhookId: webhook.id,
          },
        });
        return;
      }
      const webhookBody: Static<typeof TransactionSchema> =
        toTransactionSchema(transaction);
      resp = await sendWebhookRequest(webhook, webhookBody);
      break;
    }

    case WebhooksEventTypes.BACKEND_WALLET_BALANCE: {
      const webhookBody: BackendWalletBalanceWebhookParams = data.body;
      resp = await sendWebhookRequest(webhook, webhookBody);
      break;
    }

    case WebhooksEventTypes.WALLET_SUBSCRIPTION: {
      const webhookBody: WalletSubscriptionWebhookParams = data.body;
      resp = await sendWebhookRequest(
        webhook,
        webhookBody as unknown as Record<string, unknown>,
      );
      break;
    }
  }

  // Log the response
  if (resp) {
    const logLevel = resp.ok ? "info" : resp.status >= 500 ? "error" : "warn";
    logger({
      service: "worker",
      level: logLevel,
      message: `[Webhook] Webhook response received: ${resp.status} for transaction ${transactionId} at destination ${webhook.url}`,
      queueId: transactionId,
      data: {
        eventType: data.type,
        destination: webhook.url,
        webhookId: webhook.id,
        responseCode: resp.status,
        responseOk: resp.ok,
        hmacMode,
        responseBody: resp.body.substring(0, 200), // Truncate response body to first 200 chars
      },
    });
  }

  // Throw on 5xx so it remains in the queue to retry later.
  if (resp && resp.status >= 500) {
    const error = new Error(
      `Received status ${resp.status} from webhook ${webhook.url}.`,
    );
    job.log(error.message);
    logger({
      level: "error",
      message: `[Webhook] 5xx error, will retry`,
      service: "worker",
      queueId: transactionId,
      data: {
        eventType: data.type,
        destination: webhook.url,
        webhookId: webhook.id,
        responseCode: resp.status,
        hmacMode,
      },
    });
    throw error;
  }
};

// Must be explicitly called for the worker to run on this host.
export const initSendWebhookWorker = () => {
  new Worker(SendWebhookQueue.q.name, handler, {
    concurrency: env.SEND_WEBHOOK_QUEUE_CONCURRENCY,
    connection: redis,
  });
};
