import type { Webhooks } from "@prisma/client";
import assert from "node:assert";
import crypto, { randomUUID } from "node:crypto";
import { Agent, fetch } from "undici";
import { getConfig } from "./cache/get-config";
import { env } from "./env";
import { prettifyError } from "./error";
import { generateSecretHmac256 } from "./custom-auth-header";

function generateSignature(
  body: Record<string, unknown>,
  timestampSeconds: number,
  secret: string,
): string {
  const _body = JSON.stringify(body);
  const payload = `${timestampSeconds}.${_body}`;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function generateAuthorization(args: {
  webhook: Webhooks;
  timestamp: Date;
  body: Record<string, unknown>;
}): string {
  const { webhook, timestamp, body } = args;

  if (env.ENABLE_CUSTOM_HMAC_AUTH) {
    assert(
      env.CUSTOM_HMAC_AUTH_CLIENT_ID,
      'Missing "CUSTOM_HMAC_AUTH_CLIENT_ID".',
    );
    assert(
      env.CUSTOM_HMAC_AUTH_CLIENT_SECRET,
      'Missing "CUSTOM_HMAC_AUTH_CLIENT_SECRET"',
    );

    return generateSecretHmac256({
      webhookUrl: webhook.url,
      body,
      timestamp,
      nonce: randomUUID(),
      clientId: env.CUSTOM_HMAC_AUTH_CLIENT_ID,
      clientSecret: env.CUSTOM_HMAC_AUTH_CLIENT_SECRET,
    });
  }

  return `Bearer ${webhook.secret}`;
}

export function generateRequestHeaders(args: {
  webhook: Webhooks;
  body: Record<string, unknown>;
  timestamp: Date;
}): HeadersInit {
  const { webhook, body, timestamp } = args;

  const timestampSeconds = Math.floor(timestamp.getTime() / 1000);
  const signature = generateSignature(body, timestampSeconds, webhook.secret);
  const authorization = generateAuthorization({ webhook, timestamp, body });
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: authorization,
    "x-engine-signature": signature,
    "x-engine-timestamp": timestampSeconds.toString(),
  };
}

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
    const config = await getConfig();

    // If mTLS is enabled, provide the certificate with this request.
    const dispatcher =
      config.mtlsCertificate && config.mtlsPrivateKey
        ? new Agent({
            connect: {
              cert: config.mtlsCertificate,
              key: config.mtlsPrivateKey,
              // Validate the server's certificate.
              rejectUnauthorized: true,
            },
          })
        : undefined;

    const headers = generateRequestHeaders({
      webhook,
      body,
      timestamp: new Date(),
    });

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
