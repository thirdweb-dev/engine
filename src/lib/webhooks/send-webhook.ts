import assert from "node:assert";
import crypto, { randomUUID, createHmac } from "node:crypto";
import { Agent, fetch, type HeadersInit } from "undici";
import type { WebhookDbEntry } from "../../db/types.js";
import { env } from "../env.js";
import { ResultAsync } from "neverthrow";
import type { WebhookErr } from "../errors.js";
import { config } from "../config.js";

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
  webhook: WebhookDbEntry;
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
  webhook: WebhookDbEntry;
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

export function sendWebhookRequest(
  webhook: WebhookDbEntry,
  body: Record<string, unknown>,
): ResultAsync<WebhookResponse, WebhookErr> {
  // Setup mTLS dispatcher outside the promise
  const headers = generateRequestHeaders({
    webhook,
    body,
    timestamp: new Date(),
  });

  const dispatcher =
    config.decrypted.mtlsCertificate && config.decrypted.mtlsPrivateKey
      ? new Agent({
          connect: {
            cert: config.decrypted.mtlsCertificate,
            key: config.decrypted.mtlsPrivateKey,
            rejectUnauthorized: true,
          },
        })
      : undefined;

  return ResultAsync.fromPromise(
    fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      dispatcher,
    }).then(async (resp) => ({
      ok: resp.ok,
      status: resp.status,
      body: await resp.text(),
    })),
    (error): WebhookErr => ({
      kind: "webhook",
      code: "request_failed",
      status: 500,
      source: error instanceof Error ? error : undefined,
    }),
  );
}

/**
 * Generates an HMAC-256 secret to set in the "Authorization" header.
 *
 * @param webhookUrl - The URL to call.
 * @param body - The request body.
 * @param timestamp - The request timestamp.
 * @param nonce - A unique string for this request. Should not be re-used.
 * @param clientId - Your application's client id.
 * @param clientSecret - Your application's client secret.
 * @returns
 */
export function generateSecretHmac256(args: {
  webhookUrl: string;
  body: Record<string, unknown>;
  timestamp: Date;
  nonce: string;
  clientId: string;
  clientSecret: string;
}): string {
  const { webhookUrl, body, timestamp, nonce, clientId, clientSecret } = args;

  // Create the body hash by hashing the payload.
  const bodyHash = createHmac("sha256", clientSecret)
    .update(JSON.stringify(body), "utf8")
    .digest("base64");

  // Create the signature hash by hashing the signature.
  const ts = timestamp.getTime(); // timestamp expected in milliseconds
  const httpMethod = "POST";
  const url = new URL(webhookUrl);
  const resourcePath = url.pathname;
  const host = url.hostname;
  const port = url.port
    ? Number.parseInt(url.port)
    : url.protocol === "https:"
    ? 443
    : 80;

  const signature = [
    ts,
    nonce,
    httpMethod,
    resourcePath,
    host,
    port,
    bodyHash,
    "", // to insert a newline at the end
  ].join("\n");

  const signatureHash = createHmac("sha256", clientSecret)
    .update(signature, "utf8")
    .digest("base64");

  return [
    `MAC id="${clientId}"`,
    `ts="${ts}"`,
    `nonce="${nonce}"`,
    `bodyhash="${bodyHash}"`,
    `mac="${signatureHash}"`,
  ].join(",");
}
