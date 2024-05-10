import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { toEventLogSchema } from "../../server/schemas/eventLog";
import { toTransactionReceiptSchema } from "../../server/schemas/transactionReceipt";
import { redis } from "../../utils/redis/redis";
import { WebhookResponse, sendWebhookRequest } from "../../utils/webhook";
import { WebhookJob } from "../queues/queues";
import { logWorkerEvents } from "../queues/worker";

const handleWebhook: Processor<any, void, string> = async (
  job: Job<string>,
) => {
  const { data, webhook } = superjson.parse<WebhookJob>(job.data);

  let resp: WebhookResponse | undefined;
  if (data.type === WebhooksEventTypes.CONTRACT_SUBSCRIPTION) {
    let webhookBody: Record<string, any>;
    if (data.eventLog) {
      webhookBody = toEventLogSchema(data.eventLog);
    } else if (data.transactionReceipt) {
      webhookBody = toTransactionReceiptSchema(data.transactionReceipt);
    } else {
      throw new Error(
        'Missing "eventLog" or "transactionReceipt" for CONTRACT_SUBSCRIPTION webhook.',
      );
    }
    resp = await sendWebhookRequest(webhook, webhookBody);
  }

  if (resp && !resp.ok) {
    // Throw on non-2xx so it remains in the queue to retry later.
    throw new Error(
      `Received status ${resp.status} from webhook ${webhook.url}.`,
    );
  }
};

const webhookWorker = new Worker("webhook", handleWebhook, {
  concurrency: 1,
  connection: redis,
});
logWorkerEvents(webhookWorker);
