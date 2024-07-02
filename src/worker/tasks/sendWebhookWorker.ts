import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { toEventLogSchema } from "../../server/schemas/eventLog";
import { toTransactionReceiptSchema } from "../../server/schemas/transactionReceipt";
import { redis } from "../../utils/redis/redis";
import { WebhookResponse, sendWebhookRequest } from "../../utils/webhook";
import { logWorkerEvents } from "../queues/queues";
import {
  SEND_WEBHOOK_QUEUE_NAME,
  WebhookJob,
} from "../queues/sendWebhookQueue";

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
      // @TODO
      // const transaction = getTransaction(data.queueId);
      // const webhookBody: Static<typeof transactionResponseSchema> = {};
      // resp = await sendWebhookRequest(webhook, webhookBody);
      break;
    }
  }

  if (resp && !resp.ok) {
    // Throw on non-2xx so it remains in the queue to retry later.
    throw new Error(
      `Received status ${resp.status} from webhook ${webhook.url}.`,
    );
  }
};

// Worker
const _worker = new Worker(SEND_WEBHOOK_QUEUE_NAME, handler, {
  concurrency: 10,
  connection: redis,
});
logWorkerEvents(_worker);
