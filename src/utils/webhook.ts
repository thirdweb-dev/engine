import type { Webhooks } from "@prisma/client";
import crypto, { randomUUID } from "node:crypto";
import { Agent, fetch } from "undici";
import { getConfig } from "./cache/getConfig";
import { decrypt } from "./crypto";
import { env } from "./env";
import { prettifyError } from "./error";
import { generateSecretHmac256 } from "./webhook/customAuthHeader";

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
    const config = await getConfig();

    // If mTLS is enabled, provide the certificate with this request.
    const dispatcher =
      config.mtlsCertificate && config.mtlsPrivateKey
        ? new Agent({
            connect: {
              cert: decrypt(config.mtlsCertificate),
              key: decrypt(config.mtlsPrivateKey),
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
