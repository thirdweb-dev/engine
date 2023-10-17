import { getTxById } from "../../src/db/transactions/getTxById";
import { env } from "../../src/utils/env";
import { logger } from "../../src/utils/logger";

export const sendWebhook = async (data: any): Promise<void> => {
  try {
    const txData = await getTxById({ queueId: data.id });
    const headers: {
      Accept: string;
      "Content-Type": string;
      Authorization?: string;
    } = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (process.env.WEBHOOK_AUTH_BEARER_TOKEN) {
      headers[
        "Authorization"
      ] = `Bearer ${process.env.WEBHOOK_AUTH_BEARER_TOKEN}`;
    }

    const response = await fetch(env.WEBHOOK_URL, {
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
