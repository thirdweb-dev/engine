import { Static } from "@sinclair/typebox";
import crypto from "crypto";
import { getConfiguration } from "../../src/db/configuration/getConfiguration";
import { getTxById } from "../../src/db/transactions/getTxById";
import {
  SanitizedWebHooksSchema,
  WalletBalanceWebhookSchema,
  WebhooksEventTypes,
} from "../../src/schema/webhooks";
import { logger } from "../../src/utils/logger";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../schemas/transaction";
import { getWebhookConfig } from "../utils/cache/getWebhook";

let balanceNotificationLastSentAt = -1;

interface TxWebookParams {
  id: string;
}

export const generateSignature = (
  body: Static<typeof transactionResponseSchema> | WalletBalanceWebhookSchema,
  timestamp: string,
  secret: string,
): string => {
  const payload = `${timestamp}.${body}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

export const createWebhookRequestHeaders = async (
  webhookConfig: SanitizedWebHooksSchema,
  body: Static<typeof transactionResponseSchema> | WalletBalanceWebhookSchema,
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

const sendWebhookRequest = async (
  webhookConfig: SanitizedWebHooksSchema,
  body: Static<typeof transactionResponseSchema> | WalletBalanceWebhookSchema,
): Promise<boolean> => {
  const headers = await createWebhookRequestHeaders(webhookConfig, body);
  const response = await fetch(webhookConfig?.url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    logger.server.error(
      `[sendWebhook] Webhook Request error: ${response.status} ${response.statusText}`,
    );

    return false;
  }

  return true;
};

export const sendTxWebhook = async (data: TxWebookParams): Promise<void> => {
  try {
    const txData = await getTxById({ queueId: data.id });

    let webhookConfig: SanitizedWebHooksSchema[] | undefined =
      await getWebhookConfig(WebhooksEventTypes.ALL_TX);

    // For Backwards Compatibility
    const config = await getConfiguration();
    if (config?.webhookUrl && config?.webhookAuthBearerToken) {
      const newFormatWebhookData = {
        id: 0,
        url: config.webhookUrl,
        secret: config.webhookAuthBearerToken,
        active: true,
        eventType: WebhooksEventTypes.ALL_TX,
        createdAt: new Date().toISOString(),
        name: "Legacy Webhook",
      };
      webhookConfig = [newFormatWebhookData];
      webhookConfig.map(async (config) => {
        await sendWebhookRequest(config, txData);
      });
      return;
    }

    if (!webhookConfig) {
      switch (txData.status) {
        case TransactionStatusEnum.Queued:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.QUEUED_TX);
          break;
        case TransactionStatusEnum.Submitted:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.SENT_TX);
          break;
        case TransactionStatusEnum.Retried:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.RETRIED_TX);
          break;
        case TransactionStatusEnum.Mined:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.MINED_TX);
          break;
        case TransactionStatusEnum.Errored:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.ERRORED_TX);
          break;
        case TransactionStatusEnum.Cancelled:
          webhookConfig = await getWebhookConfig(WebhooksEventTypes.ERRORED_TX);
          break;
      }
    }

    webhookConfig?.map(async (config) => {
      if (!config || !config?.active) {
        logger.server.debug("No Webhook Set or Active, skipping webhook send");
        return;
      }

      await sendWebhookRequest(config, txData);
    });
  } catch (error) {
    logger.server.error(`[sendWebhook] error: ${error}`);
  }
};

// TODO: Add retry logic upto
export const sendBalanceWebhook = async (
  data: WalletBalanceWebhookSchema,
): Promise<void> => {
  try {
    const elaspsedTime = Date.now() - balanceNotificationLastSentAt;
    if (elaspsedTime < 30000) {
      logger.server.warn(
        `[sendBalanceWebhook] Low Wallet Balance Notification Sent within last 30 Seconds. Skipping.`,
      );
      return;
    }

    const webhookConfig = await getWebhookConfig(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );

    if (!webhookConfig) {
      logger.server.debug("No Webhook set, skipping webhook send");
      return;
    }

    webhookConfig.map(async (config) => {
      if (!config || !config.active) {
        logger.server.debug("No Webhook set, skipping webhook send");
        return;
      }

      const success = await sendWebhookRequest(config, data);

      if (success) {
        balanceNotificationLastSentAt = Date.now();
      }
    });
  } catch (error) {
    logger.server.error(`[sendWebhook] error: ${error}`);
  }
};
