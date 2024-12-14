import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/client";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks";
import { thirdwebClient } from "../../shared/utils/sdk";
import { eth_getBalance, getRpcClient, toTokens } from "thirdweb";
import { getChain } from "../../shared/utils/chain";
import { SendWebhookQueue } from "../queues/send-webhook-queue";
import { logger } from "../../shared/utils/logger";

type WebhookDetail = {
  id: number;
  name: string | null;
  url: string;
  secret: string;
  eventType: string;
  config: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

export const trackAddressBalance = async () => {
  const today = Date.now();
  const oneDayAgo = today - 24 * 60 * 60 * 1000;

  // returns new webhooks that have not been notified or at 1 day interval
  const webhookDetails = await prisma.webhooks.findMany({
    where: {
      eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
      config: { path: ["address"], not: Prisma.JsonNull },
      OR: [
        { config: { path: ["lastNotify"], equals: Prisma.JsonNull } },
        { config: { path: ["lastNotify"], lt: oneDayAgo } },
      ],
    },
  });

  let promises = [];
  let ids = [];
  for (const webhookDetail of webhookDetails) {
    if (!webhookDetail.config?.address) continue;
    if (!webhookDetail.config?.chainId) continue;

    ids.push(webhookDetail.id);
    promises.push(
      _checkBalanceAndEnqueueWebhook(webhookDetail).catch((e) => logger({ e })),
    );

    if (ids.length >= 10) {
      await Promise.allSettled(promises);
      await _updateLastNotify(ids, today);
      promises = [];
      ids = [];
    }
  }
  if (ids.length) {
    await Promise.allSettled(promises);
    await _updateLastNotify(ids, today);
  }
};

const _checkBalanceAndEnqueueWebhook = async (webhookDetail: WebhookDetail) => {
  const { address, chainId, threshold } = webhookDetail.config;

  // get native balance of address
  const currentBalance = await eth_getBalance(
    getRpcClient({
      client: thirdwebClient,
      chain: await getChain(chainId),
    }),
    { address },
  );

  // dont do anything if has enough balance
  if (currentBalance > threshold) return;

  await SendWebhookQueue.enqueueWebhook({
    type: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    body: {
      chainId,
      walletAddress: address,
      minimumBalance: threshold,
      currentBalance: currentBalance.toString(),
      message: `LowBalance: The address ${address} on chain ${chainId} has ${toTokens(
        currentBalance,
        18,
      )} gas remaining.`,
    },
  });
};

const _updateLastNotify = async (webhookIds: number[], time: number) => {
  // using query as only want to update a single field in config json and not replace the object
  await prisma.$executeRaw`
    UPDATE webhooks
    SET config = jsonb_set(config, '{lastNotify}', ${time}::jsonb, true)
    WHERE id = ANY(${webhookIds});`;
};
