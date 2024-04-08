import { Job, Worker } from "bullmq";
import superjson from "superjson";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { toTransactionResponse } from "../../server/schemas/transaction";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { WebhookResponse, sendWebhookRequest } from "../../utils/webhook";
import { WebhookJob, WebhookQueue } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

export class WebhookWorker {
  private w: Worker;

  constructor() {
    this.w = new Worker(WebhookQueue.name, this.handle, {
      concurrency: env.WEBHOOK_WORKER_CONCURRENCY,
      connection: redis,
    });
    logWorkerEvents(this.w);
  }

  handle = async (job: Job) => {
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
}
