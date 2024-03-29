import { Webhooks } from "@prisma/client";
import crypto from "crypto";

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

export const sendWebhookRequest = async (
  webhook: Webhooks,
  body: Record<string, any | null>,
) => {
  const headers = await createWebhookRequestHeaders(webhook, body);
  const resp = await fetch(webhook.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Ignore body response.
  await resp.body?.cancel();
  if (!resp.ok) {
    throw `Unexpected status: ${resp.status}: ${await resp.text()}`;
  }
};

// TODO: Add retry logic upto
// export const sendBalanceWebhook = async (
//   data: WalletBalanceWebhookSchema,
// ): Promise<void> => {
//   try {
//     const elaspsedTime = Date.now() - balanceNotificationLastSentAt;
//     if (elaspsedTime < 30000) {
//       logger({
//         service: "server",
//         level: "warn",
//         message: `[sendBalanceWebhook] Low wallet balance notification sent within last 30 Seconds. Skipping.`,
//       });
//       return;
//     }

//     const webhooks = await getWebhook(
//       WebhooksEventTypes.BACKEND_WALLET_BALANCE,
//     );

//     if (webhooks.length === 0) {
//       logger({
//         service: "server",
//         level: "debug",
//         message: "No webhook set, skipping webhook send",
//       });

//       return;
//     }

//     webhooks.map(async (config) => {
//       if (!config || !config.active) {
//         logger({
//           service: "server",
//           level: "debug",
//           message: "No webhook set or active, skipping webhook send",
//         });

//         return;
//       }

//       const success = await sendWebhookRequest(config, data);

//       if (success) {
//         balanceNotificationLastSentAt = Date.now();
//       }
//     });
//   } catch (error) {
//     logger({
//       service: "server",
//       level: "error",
//       message: `Failed to send balance webhook`,
//       error,
//     });
//   }
// };
