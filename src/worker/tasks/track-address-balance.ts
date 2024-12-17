import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/client";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks";
import { thirdwebClient } from "../../shared/utils/sdk";
import { getChain } from "../../shared/utils/chain";
import { SendWebhookQueue } from "../queues/send-webhook-queue";
import { logger } from "../../shared/utils/logger";
import { getWalletBalance } from "thirdweb/wallets";

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

type WebhookConfig = {
  address: string;
  chainId: number;
  threshold: number;
};

export const trackAddressBalance = async () => {
  const today = Date.now();
  const oneDayAgo = today - 24 * 60 * 60 * 1000;

  // returns new webhooks that have not been notified at all or was last notified 1 day ago
  const webhookDetails = await prisma.webhooks.findMany({
    where: {
      eventType: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
      config: { path: ["address"], not: Prisma.AnyNull },
      OR: [
        { config: { path: ["lastNotify"], equals: Prisma.AnyNull } },
        { config: { path: ["lastNotify"], lt: oneDayAgo } },
      ],
    },
  });

  let promises = [];
  let ids = [];
  for (const webhookDetail of webhookDetails) {
    const config = webhookDetail.config as WebhookConfig | null;
    if (!config?.address) continue;
    if (!config?.chainId) continue;

    ids.push(webhookDetail.id);
    promises.push(
      _checkBalanceAndEnqueueWebhook(webhookDetail).catch((e) =>
        logger({
          service: "worker",
          level: "warn",
          message: `errored while _checkBalanceAndEnqueueWebhook for ${webhookDetail.id}`,
          error: e,
        }),
      ),
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
  const { address, chainId, threshold } = webhookDetail.config as WebhookConfig;

  // get native balance of address
  const balanceData = await getWalletBalance({
    client: thirdwebClient,
    address,
    chain: await getChain(chainId),
  });
  const currentBalance = balanceData.displayValue;

  // dont do anything if has enough balance
  if (Number.parseFloat(currentBalance) > threshold) return;

  await SendWebhookQueue.enqueueWebhook({
    type: WebhooksEventTypes.BACKEND_WALLET_BALANCE,
    body: {
      chainId,
      walletAddress: address,
      minimumBalance: threshold.toString(),
      currentBalance: currentBalance,
      message: `LowBalance: The address ${address} on chain ${chainId} has ${Number.parseFloat(
        currentBalance,
      )
        .toFixed(2)
        .toString()}/${threshold} gas remaining.`,
    },
  });
};

const _updateLastNotify = async (webhookIds: number[], time: number) => {
  // using query as only want to update a single field in config json and not replace the entire object
  await prisma.$executeRaw`
    update webhooks 
    set config=jsonb_set(config, '{lastNotify}', ${time.toString()}::jsonb, true) 
    where id = any(array[${webhookIds}]);`;
};
