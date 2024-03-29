import { Static } from "@sinclair/typebox";
import crypto from "crypto";
import {
  SanitizedWebHooksSchema,
  WalletBalanceWebhookSchema,
  WebhooksEventTypes,
} from "../schema/webhooks";
import {
  TransactionStatus,
  transactionResponseSchema,
} from "../server/schemas/transaction";
import { getWebhook } from "./cache/getWebhook";
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
  webhookConfig: SanitizedWebHooksSchema,
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

  if (webhookConfig.secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(body, timestamp, webhookConfig.secret);

    headers["Authorization"] = `Bearer ${webhookConfig.secret}`;
    headers["x-engine-signature"] = signature;
    headers["x-engine-timestamp"] = timestamp;
  }

  return headers;
};

export const sendWebhookRequest = async (
  webhookConfig: SanitizedWebHooksSchema,
  body: Record<string, any | null>,
): Promise<boolean> => {
  try {
    const headers = await createWebhookRequestHeaders(webhookConfig, body);
    const response = await fetch(webhookConfig?.url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger({
        service: "server",
        level: "error",
        message: `[sendWebhook] Webhook request error: ${response.status} ${response.statusText}`,
      });

      return false;
    }

    return true;
  } catch (error) {
    logger({
      service: "server",
      level: "error",
      message: `[sendWebhook] Webhook request error: ${error}`,
      error,
    });
    return false;
  }
};

export interface WebhookData {
  id: string;
  data?: Static<typeof transactionResponseSchema>;
  status: TransactionStatus;
  url?: string;
}

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

    const webhooks = await getWebhook(
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
      if (!config || !config.active) {
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
