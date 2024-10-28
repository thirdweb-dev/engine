import type { Webhooks } from "@prisma/client";
import crypto, { randomUUID } from "node:crypto";
import { Agent, fetch } from "undici";
import {
  WebhooksEventTypes,
  type WalletBalanceWebhookSchema,
} from "../schema/webhooks";
import { getWebhooksByEventType } from "./cache/getWebhook";
import { decrypt } from "./crypto";
import { env } from "./env";
import { prettifyError } from "./error";
import { logger } from "./logger";
import { generateSecretHmac256 } from "./webhook/customAuthHeader";

let balanceNotificationLastSentAt = -1;

const generateSignature = (
  body: Record<string, unknown>,
  timestampSeconds: number,
  secret: string,
): string => {
  const _body = JSON.stringify(body);
  const payload = `${timestampSeconds}.${_body}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
};

const generateAuthorization = (args: {
  webhook: Webhooks;
  timestampSeconds: number;
  body: Record<string, unknown>;
}): string => {
  const { webhook, timestampSeconds, body } = args;
  if (env.ENABLE_CUSTOM_HMAC_AUTH) {
    return generateSecretHmac256({
      webhookUrl: webhook.url,
      body,
      timestampSeconds,
      nonce: randomUUID(),
      // DEBUG
      clientId: "@TODO: UNIMPLEMENTED",
      clientSecret: "@TODO: UNIMPLEMENTED",
    });
  }
  return `Bearer ${webhook.secret}`;
};

const generateRequestHeaders = (
  webhook: Webhooks,
  body: Record<string, unknown>,
): HeadersInit => {
  const timestampSeconds = Math.floor(Date.now() / 1000);
  const signature = generateSignature(body, timestampSeconds, webhook.secret);
  const authorization = generateAuthorization({
    webhook,
    timestampSeconds,
    body,
  });
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: authorization,
    "x-engine-signature": signature,
    "x-engine-timestamp": timestampSeconds.toString(),
  };
};

export interface WebhookResponse {
  ok: boolean;
  status: number;
  body: string;
}

export const sendWebhookRequest = async (
  webhook: Webhooks,
  body: Record<string, unknown>,
): Promise<WebhookResponse> => {
  try {
    // If mTLS is enabled, provide the certificate with this request.
    const dispatcher =
      webhook.mtlsClientCert && webhook.mtlsClientKey
        ? new Agent({
            connect: {
              cert: decrypt(webhook.mtlsClientCert),
              key: decrypt(webhook.mtlsClientKey),
              ca: webhook.mtlsCaCert ? decrypt(webhook.mtlsCaCert) : undefined,
              // Validate the server's certificate.
              rejectUnauthorized: true,
            },
          })
        : undefined;

    const headers = await generateRequestHeaders(webhook, body);
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      dispatcher,
    });

    return {
      ok: resp.ok,
      status: resp.status,
      body: await resp.text(),
    };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      body: prettifyError(e),
    };
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
