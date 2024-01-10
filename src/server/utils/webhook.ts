import crypto from "crypto";
import { getTxByIds } from "../../db/transactions/getTxByIds";
import {
  SanitizedWebHooksSchema,
  WalletBalanceWebhookSchema,
  WebhooksEventTypes,
} from "../../schema/webhooks";
import { getWebhook } from "../../utils/cache/getWebhook";
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

interface WebhookData {
  queueId: string;
  status: WebhooksEventTypes;
}

export const sendWebhooks = async (webhooks: WebhookData[]) => {
  const queueIds = webhooks.map((webhook) => webhook.queueId);
  const txs = await getTxByIds({ queueIds });
  if (!txs || txs.length === 0) {
    return;
  }

  const webhooksWithTxs = webhooks
    .map((webhook) => {
      const tx = txs.find((tx) => tx.queueId === webhook.queueId);
      return {
        ...webhook,
        tx,
      };
    })
    .filter((webhook) => !!webhook.tx);

  for (const webhook of webhooksWithTxs) {
    const webhookConfigs = await Promise.all([
      ...((await getWebhook(WebhooksEventTypes.ALL_TX)) || []),
      ...((await getWebhook(webhook.status)) || []),
    ]);

    await Promise.all(
      webhookConfigs.map(async (webhookConfig) => {
        if (!webhookConfig.active) {
          logger({
            service: "server",
            level: "debug",
            message: "No webhook set or active, skipping webhook send",
          });

          return;
        }

        await sendWebhookRequest(
          webhookConfig,
          webhook.tx as Record<string, any>,
        );
      }),
    );
  }
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
          await getWebhook(WebhooksEventTypes.ALL_TX);

        if (!webhookConfig) {
          switch (txData.status) {
            case TransactionStatusEnum.Queued:
              webhookConfig = await getWebhook(WebhooksEventTypes.QUEUED_TX);
              break;
            case TransactionStatusEnum.Submitted:
              webhookConfig = await getWebhook(WebhooksEventTypes.SENT_TX);
              break;
            case TransactionStatusEnum.Retried:
              webhookConfig = await getWebhook(WebhooksEventTypes.RETRIED_TX);
              break;
            case TransactionStatusEnum.Mined:
              webhookConfig = await getWebhook(WebhooksEventTypes.MINED_TX);
              break;
            case TransactionStatusEnum.Errored:
              webhookConfig = await getWebhook(WebhooksEventTypes.ERRORED_TX);
              break;
            case TransactionStatusEnum.Cancelled:
              webhookConfig = await getWebhook(WebhooksEventTypes.ERRORED_TX);
              break;
          }
        }

        await Promise.all(
          webhookConfig?.map(async (config) => {
            if (!config || !config?.active) {
              logger({
                service: "server",
                level: "debug",
                message: "No webhook set or active, skipping webhook send",
              });

              return;
            }

            await sendWebhookRequest(config, txData);
          }) || [],
        );
      }
    }
  } catch (error) {
    logger({
      service: "server",
      level: "error",
      message: `Failed to send webhook`,
      error,
    });
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

    const webhookConfig = await getWebhook(
      WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    );

    if (!webhookConfig) {
      logger({
        service: "server",
        level: "debug",
        message: "No webhook set, skipping webhook send",
      });

      return;
    }

    webhookConfig.map(async (config) => {
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
