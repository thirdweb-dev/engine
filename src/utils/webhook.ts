import { Webhooks } from "@prisma/client";
import crypto from "crypto";
import { getTransactionsByQueueIds } from "../db/transactions/getTxByIds";
import {
  WalletBalanceWebhookSchema,
  WebhooksEventTypes,
} from "../schema/webhooks";
import {
  TransactionStatus,
  toTransactionSchema,
} from "../server/schemas/transaction";
import { enqueueWebhook } from "../worker/queues/sendWebhookQueue";
import { getWebhooksByEventType } from "./cache/getWebhook";
import { logger } from "./logger";

let balanceNotificationLastSentAt = -1;

export const generateSignature = (
  body: Record<string, any>,
  timestamp: string,
  secret: string,
): string => {
  const _body = JSON.stringify(body);
  const payload = `${timestamp}.${_body}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

export const createWebhookRequestHeaders = async (
  webhook: Webhooks,
  body: Record<string, any>,
): Promise<HeadersInit> => {
  const headers: {
    Accept: string;
    "Content-Type": string;
    Authorization?: string;
    "x-engine-signature"?: string;
    "x-engine-timestamp"?: string;
  } = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (webhook.secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(body, timestamp, webhook.secret);

    headers["Authorization"] = `Bearer ${webhook.secret}`;
    headers["x-engine-signature"] = signature;
    headers["x-engine-timestamp"] = timestamp;
  }

  return headers;
};

export interface WebhookResponse {
  ok: boolean;
  status: number;
  body: string;
}

export const sendWebhookRequest = async (
  webhook: Webhooks,
  body: Record<string, any>,
): Promise<WebhookResponse> => {
  try {
    const headers = await createWebhookRequestHeaders(webhook, body);
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    return {
      ok: resp.ok,
      status: resp.status,
      body: await resp.text(),
    };
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      body: e.toString(),
    };
  }
};

export interface WebhookData {
  queueId: string;
  status: TransactionStatus;
}

export const sendWebhooks = async (data: WebhookData[]) => {
  const queueIds = data.map((d) => d.queueId);
  const transactions = await getTransactionsByQueueIds(queueIds);

  for (const transaction of transactions) {
    const transactionResponse = toTransactionSchema(transaction);
    const type =
      transactionResponse.status === TransactionStatus.Queued
        ? WebhooksEventTypes.QUEUED_TX
        : transactionResponse.status === TransactionStatus.Sent
        ? WebhooksEventTypes.SENT_TX
        : transactionResponse.status === TransactionStatus.Mined
        ? WebhooksEventTypes.MINED_TX
        : transactionResponse.status === TransactionStatus.Errored
        ? WebhooksEventTypes.ERRORED_TX
        : transactionResponse.status === TransactionStatus.Cancelled
        ? WebhooksEventTypes.CANCELLED_TX
        : undefined;

    if (type) {
      await enqueueWebhook({ type, transaction });
    }
  }
};

// TODO: Add retry logic upto
export const sendBalanceWebhook = async (
  data: WalletBalanceWebhookSchema,
): Promise<void> => {
  try {
    const elaspsedTime = Date.now() - balanceNotificationLastSentAt;
    if (elaspsedTime < 30000) {
      logger({
        service: "server",
        level: "warn",
        message: `[sendBalanceWebhook] Low wallet balance notification sent within last 30 Seconds. Skipping.`,
      });
      return;
    }

    const webhooks = await getWebhooksByEventType(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );

    if (webhooks.length === 0) {
      logger({
        service: "server",
        level: "debug",
        message: "No webhook set, skipping webhook send",
      });

      return;
    }

    webhooks.map(async (config) => {
      if (!config || config.revokedAt) {
        logger({
          service: "server",
          level: "debug",
          message: "No webhook set or active, skipping webhook send",
        });

        return;
      }

      const success = await sendWebhookRequest(config, data);

      if (success) {
        balanceNotificationLastSentAt = Date.now();
      }
    });
  } catch (error) {
    logger({
      service: "server",
      level: "error",
      message: `Failed to send balance webhook`,
      error,
    });
  }
};
