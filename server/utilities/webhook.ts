import { getTxById } from "../../src/db/transactions/getTxById";
import { logger } from "../../src/utils/logger";
import { getWebhookConfig } from "../utils/cache/getWebhookConfig";

export const sendWebhook = async (data: any): Promise<void> => {
  try {
    const webhookConfig = await getWebhookConfig();

    if (!webhookConfig.webhookUrl) {
      logger.server.debug("No WebhookURL set, skipping webhook send");
      return;
    }

    const txData = await getTxById({ queueId: data.id });
    const headers: {
      Accept: string;
      "Content-Type": string;
      Authorization?: string;
    } = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (webhookConfig.webhookAuthBearerToken) {
      headers[
        "Authorization"
      ] = `Bearer ${webhookConfig.webhookAuthBearerToken}`;
    }

    const response = await fetch(webhookConfig.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(txData),
    });

    if (!response.ok) {
      logger.server.error(
        `[sendWebhook] Webhook Request error: ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    logger.server.error(`[sendWebhook] error: ${error}`);
  }
};
