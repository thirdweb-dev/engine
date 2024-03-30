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

export interface WebhookResponse {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Calls a webhok URL with the appropriate headers and body.
 * @param webhook
 * @param body
 * @returns ok boolean Whether the response was 2xx.
 * @returns status number The response status code.
 * @returns body string The response body.
 */
export const sendWebhookRequest = async (
  webhook: Webhooks,
  body: Record<string, any>,
): Promise<WebhookResponse> => {
  try {
    const headers = await createWebhookRequestHeaders(webhook, body);
    const resp = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    return {
      ok: resp.ok,
      status: resp.status,
      body: await resp.text(),
    };
  } catch (e: any) {
    return {
      ok: false,
      status: 500,
      body: e,
    };
  }
};
