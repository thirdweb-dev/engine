import { Static } from "@sinclair/typebox";
import crypto from "crypto";
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
    "X-Signature"?: string;
    "X-Timestamp"?: string;
  } = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (webhookConfig.secret) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignature(body, timestamp, webhookConfig.secret);

    headers["Authorization"] = `Bearer ${webhookConfig.secret}`;
    headers["X-Signature"] = signature;
    headers["X-Timestamp"] = timestamp;
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

    let webhookConfig: SanitizedWebHooksSchema | undefined =
      await getWebhookConfig(WebhooksEventTypes.ALL_TX);

    if (txData.status === TransactionStatusEnum.Queued && !webhookConfig) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.QUEUED_TX);
    } else if (
      txData.status === TransactionStatusEnum.Submitted &&
      !webhookConfig
    ) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.SENT_TX);
    } else if (
      txData.status === TransactionStatusEnum.Retried &&
      !webhookConfig
    ) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.RETRIED_TX);
    } else if (
      txData.status === TransactionStatusEnum.Mined &&
      !webhookConfig
    ) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.MINED_TX);
    } else if (
      txData.status === TransactionStatusEnum.Errored &&
      !webhookConfig
    ) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.ERRORED_TX);
    } else if (
      txData.status === TransactionStatusEnum.Cancelled &&
      !webhookConfig
    ) {
      webhookConfig = await getWebhookConfig(WebhooksEventTypes.ERRORED_TX);
    }

    if (!webhookConfig || !webhookConfig?.active) {
      logger.server.debug("No Webhook Set or Active, skipping webhook send");
      return;
    }

    await sendWebhookRequest(webhookConfig, txData);
  } catch (error) {
    logger.server.error(`[sendWebhook] error: ${error}`);
  }
};

export const sendBalanceWebhook = async (
  data: WalletBalanceWebhookSchema,
): Promise<void> => {
  try {
    const elaspsedTime = Date.now() - balanceNotificationLastSentAt;
    if (elaspsedTime < 60 * 1000) {
      logger.server.warn(
        `[sendBalanceWebhook] Low Wallet Balance Notification Sent within last minute. Skipping.`,
      );
      return;
    }

    const webhookConfig = await getWebhookConfig(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );

    if (!webhookConfig || !webhookConfig.active) {
      logger.server.debug("No Webhook set, skipping webhook send");
      return;
    }

    const success = await sendWebhookRequest(webhookConfig, data);

    if (success) {
      balanceNotificationLastSentAt = Date.now();
    }
  } catch (error) {
    logger.server.error(`[sendWebhook] error: ${error}`);
  }
};
