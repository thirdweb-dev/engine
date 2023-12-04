import crypto from "crypto";
import { getTxByIds } from "../../db/transactions/getTxByIds";
import {
  SanitizedWebHooksSchema,
  WalletBalanceWebhookSchema,
  WebhooksEventTypes,
} from "../../schema/webhooks";
import { getWebhookConfig } from "../../utils/cache/getWebhook";
import { logger } from "../../utils/logger";
import { TransactionStatusEnum } from "../schemas/transaction";

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
  body: Record<string, any>,
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

export const sendTxWebhook = async (queueIds: string[]): Promise<void> => {
  try {
    const txDataByIds = await getTxByIds({ queueIds });
    if (!txDataByIds || txDataByIds.length === 0) {
      return;
    }
    for (const txData of txDataByIds!) {
      if (!txData) {
        return;
      } else {
        let webhookConfig: SanitizedWebHooksSchema[] | undefined =
          await getWebhookConfig(WebhooksEventTypes.ALL_TX);

        if (!webhookConfig) {
          switch (txData.status) {
            case TransactionStatusEnum.Queued:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.QUEUED_TX,
              );
              break;
            case TransactionStatusEnum.Submitted:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.SENT_TX,
              );
              break;
            case TransactionStatusEnum.Retried:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.RETRIED_TX,
              );
              break;
            case TransactionStatusEnum.Mined:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.MINED_TX,
              );
              break;
            case TransactionStatusEnum.Errored:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.ERRORED_TX,
              );
              break;
            case TransactionStatusEnum.Cancelled:
              webhookConfig = await getWebhookConfig(
                WebhooksEventTypes.ERRORED_TX,
              );
              break;
          }
        }

        webhookConfig?.map(async (config) => {
          if (!config || !config?.active) {
            logger.server.debug(
              "No Webhook Set or Active, skipping webhook send",
            );
            return;
          }

          await sendWebhookRequest(config, txData);
        });
      }
    }
  } catch (error) {
    logger.server.error(error);
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
    logger.server.error(error);
  }
};
