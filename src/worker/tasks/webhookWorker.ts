import { Job, Processor, Worker } from "bullmq";
import { cleanTxs } from "../../db/transactions/cleanTxs";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { redis } from "../../utils/redis/redis";
import { sendWebhookRequest } from "../../utils/webhook";
import { WebhookQueueData } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

const handleWebhook: Processor<any, void, string> = async (
  job: Job<WebhookQueueData>,
) => {
  const { data, webhook } = job.data;

  if (data.type === WebhooksEventTypes.ALL_TRANSACTIONS) {
    const sanitized = cleanTxs([data.tx])[0];
    await sendWebhookRequest(webhook, sanitized);
  } else if (data.type === WebhooksEventTypes.BACKEND_WALLET_BALANCE) {
    await sendWebhookRequest(webhook, data);
  }
};

const webhookWorker = new Worker("webhook", handleWebhook, {
  concurrency: 1,
  connection: redis,
});
logWorkerEvents(webhookWorker);
