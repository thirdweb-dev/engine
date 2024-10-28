import { createHmac } from "node:crypto";

/**
 * Generates an HMAC-256 secret to set in the "Authorization" header.
 *
 * @param webhookUrl - The URL to call.
 * @param body - The request body.
 * @param timestampSeconds - The timestamp in seconds.
 * @param nonce - A unique string for this request. Should not be re-used.
 * @param clientId - Your application's client id.
 * @param clientSecret - Your application's client secret.
 * @returns
 */
export const generateSecretHmac256 = (args: {
  webhookUrl: string;
  body: Record<string, unknown>;
  timestampSeconds: number;
  nonce: string;
  clientId: string;
  clientSecret: string;
}): string => {
  const { webhookUrl, body, timestampSeconds, nonce, clientId, clientSecret } =
    args;

  // Create the body hash by hashing the payload.
  const bodyHash = createHmac("sha256", clientSecret)
    .update(JSON.stringify(body), "utf8")
    .digest("base64");

  // Create the signature hash by hashing the signature.
  const ts = timestampSeconds * 1000; // timestamp expected in milliseconds
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
  ].join(" ");
};
