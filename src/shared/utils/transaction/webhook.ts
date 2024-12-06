import { WebhooksEventTypes } from "../../schemas/webhooks";
import { SendWebhookQueue } from "../../../worker/queues/sendWebhookQueue";
import type { AnyTransaction } from "./types";

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
  if (type) {
    await SendWebhookQueue.enqueueWebhook({ type, queueId });
  }
};
