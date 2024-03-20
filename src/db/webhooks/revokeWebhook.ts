import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../server/middleware/error";
import { getRedisClient } from "../client";

type RevokeWebhooksParams = {
  id: string;
};

export const markWebhookAsRevoked = async ({ id }: RevokeWebhooksParams) => {
  const currentTimestamp = new Date();
  const redisClient = await getRedisClient();

  const exists = await redisClient.hgetall(`webhook:${id}`);

  if (!exists)
    throw createCustomError(
      `Webhook with id ${id} does not exist`,
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );

  await redisClient.hset("webhook:" + id, {
    revokedAt: currentTimestamp,
    updatedAt: currentTimestamp,
  });

  // await clearWebhookCache();
};
