import { WebhooksEventTypes } from "../../schema/webhooks";
import { enqueueWebhook } from "../../worker/queues/sendWebhookQueue";
import { AnyTransaction } from "./types";

export const enqueueTransactionWebhook = async (
  transaction: AnyTransaction,
) => {
  const { queueId, status } = transaction;
  const type =
    status === "sent"
      ? WebhooksEventTypes.SENT_TX
      : status === "mined"
      ? WebhooksEventTypes.MINED_TX
      : status === "cancelled"
      ? WebhooksEventTypes.CANCELLED_TX
      : status === "errored"
      ? WebhooksEventTypes.ERRORED_TX
      : null;

  if (!type) {
    return;
  }
  await enqueueWebhook({ type, queueId });
};
