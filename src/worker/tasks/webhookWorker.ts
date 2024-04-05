import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { toTransactionResponse } from "../../server/schemas/transaction";
import { redis } from "../../utils/redis/redis";
import { WebhookResponse, sendWebhookRequest } from "../../utils/webhook";
import { WebhookJob } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

const handleWebhook: Processor<any, void, string> = async (
  job: Job<string>,
) => {
  const { data, webhook } = superjson.parse<WebhookJob>(job.data);

  let resp: WebhookResponse | undefined;
  if (data.type === WebhooksEventTypes.ALL_TRANSACTIONS) {
    resp = await sendWebhookRequest(webhook, toTransactionResponse(data.tx));
  } else if (data.type === WebhooksEventTypes.BACKEND_WALLET_BALANCE) {
    resp = await sendWebhookRequest(webhook, data);
  }

  if (resp && !resp.ok) {
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
