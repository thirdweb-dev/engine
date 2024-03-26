import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import {
  SanitizedWebHooksSchema,
  Webhook,
  WebhooksEventTypes,
} from "../../schema/webhooks";
import { getRedisClient } from "../client";

interface CreateWebhooksParams {
  url: string;
  name?: string;
  eventType: WebhooksEventTypes;
}

export const insertWebhook = async ({
  url,
  name,
  eventType,
}: CreateWebhooksParams): Promise<SanitizedWebHooksSchema> => {
  // generate random bytes
  const bytes = randomBytes(4096);
  // hash the bytes to create the secret (this will not be stored by itself)
  const secret = createHash("sha512").update(bytes).digest("base64url");

  const redisClient = await getRedisClient();
  const id = uuidv4();
  const redisData: Webhook = {
    id,
    url,
    name: name || null,
    eventType,
    secret,
    createdAt: new Date(),
    revokedAt: null,
    updatedAt: new Date(),
  };
  await redisClient.hset("webhook:" + id, redisData);

  return {
    ...redisData,
    active: true,
    createdAt: redisData.createdAt.toISOString(),
  };
};
