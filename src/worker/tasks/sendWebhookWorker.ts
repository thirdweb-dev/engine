import type { Static } from "@sinclair/typebox";
import { type Job, type Processor, Worker } from "bullmq";
import superjson from "superjson";
import { TransactionDB } from "../../db/transactions/db";
import {
  type BackendWalletBalanceWebhookParams,
  WebhooksEventTypes,
} from "../../schema/webhooks";
import { toEventLogSchema } from "../../server/schemas/eventLog";
import {
  type TransactionSchema,
  toTransactionSchema,
} from "../../server/schemas/transaction";
import { toTransactionReceiptSchema } from "../../server/schemas/transactionReceipt";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { type WebhookResponse, sendWebhookRequest } from "../../utils/webhook";
import { SendWebhookQueue, type WebhookJob } from "../queues/sendWebhookQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { data, webhook } = superjson.parse<WebhookJob>(job.data);

  let resp: WebhookResponse | undefined;
  switch (data.type) {
    case WebhooksEventTypes.CONTRACT_SUBSCRIPTION: {
      let webhookBody: {
        type: "event-log" | "transaction-receipt";
        data: any;
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
  }

  // Throw on 5xx so it remains in the queue to retry later.
  if (resp && resp.status >= 500) {
    const error = new Error(
      `Received status ${resp.status} from webhook ${webhook.url}.`,
    );
    job.log(error.message);
    logger({
      level: "debug",
      message: error.message,
      service: "worker",
    });
    throw error;
  }
};

// Must be explicitly called for the worker to run on this host.
export const initSendWebhookWorker = () => {
  new Worker(SendWebhookQueue.q.name, handler, {
    concurrency: 10,
    connection: redis,
  });
};
