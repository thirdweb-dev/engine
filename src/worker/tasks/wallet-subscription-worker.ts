import { type Job, type Processor, Worker } from "bullmq";
import { getAllWalletSubscriptions } from "../../shared/db/wallet-subscriptions/get-all-wallet-subscriptions";
import { getConfig } from "../../shared/utils/cache/get-config";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import { WalletSubscriptionQueue } from "../queues/wallet-subscription-queue";
import { logWorkerExceptions } from "../queues/queues";
import { SendWebhookQueue } from "../queues/send-webhook-queue";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks";
import { getChain } from "../../shared/utils/chain";
import { thirdwebClient } from "../../shared/utils/sdk";
import { getWalletBalance } from "thirdweb/wallets";
import type { Chain } from "thirdweb/chains";
import type { WalletCondition } from "../../shared/schemas/wallet-subscription-conditions";
import type { WalletSubscriptions, Webhooks } from "@prisma/client";
import { prettifyError } from "../../shared/utils/error";

type WalletSubscriptionWithWebhook = WalletSubscriptions & {
  conditions: WalletCondition[];
  webhook: Webhooks | null;
};

// Split array into chunks of specified size
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

/**
 * Verify if a condition is met for a given wallet
 * Returns the current value if condition is met, undefined otherwise
 */
async function verifyCondition({
  condition,
  walletAddress,
  chain,
}: {
  condition: WalletCondition;
  walletAddress: string;
  chain: Chain;
}): Promise<string | null> {
  switch (condition.type) {
    case "token_balance_lt":
    case "token_balance_gt": {
      const currentBalanceResponse = await getWalletBalance({
        address: walletAddress,
        client: thirdwebClient,
        tokenAddress:
          condition.tokenAddress === "native"
            ? undefined
            : condition.tokenAddress,
        chain,
      });

      const currentBalance = currentBalanceResponse.value;
      const threshold = BigInt(condition.value);

      const isConditionMet =
        condition.type === "token_balance_lt"
          ? currentBalance < threshold
          : currentBalance > threshold;

      return isConditionMet ? currentBalance.toString() : null;
    }
  }
}

/**
 * Process a batch of subscriptions and trigger webhooks for any met conditions
 */
async function processSubscriptions(
  subscriptions: WalletSubscriptionWithWebhook[],
) {
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const chain = await getChain(Number.parseInt(subscription.chainId));

        // Process each condition for the subscription
        for (const condition of subscription.conditions) {
          const currentValue = await verifyCondition({
            condition,
            walletAddress: subscription.walletAddress,
            chain,
          });

          if (currentValue && subscription.webhookId && subscription.webhook) {
            await SendWebhookQueue.enqueueWebhook({
              type: WebhooksEventTypes.WALLET_SUBSCRIPTION,
              webhook: subscription.webhook,
              body: {
                subscriptionId: subscription.id,
                chainId: subscription.chainId,
                walletAddress: subscription.walletAddress,
                condition,
                currentValue,
              },
            });
          }
        }
      } catch (error) {
        // Log error but continue processing other subscriptions
        const message = prettifyError(error);
        logger({
          service: "worker",
          level: "error",
          message: `Error processing wallet subscription ${subscription.id}: ${message}`,
          error: error as Error,
        });
      }
    }),
  );
}

// Must be explicitly called for the worker to run on this host.
export const initWalletSubscriptionWorker = async () => {
  const config = await getConfig();
  const cronPattern =
    config.walletSubscriptionsCronSchedule || "*/30 * * * * *"; // Default to every 30 seconds

  logger({
    service: "worker",
    level: "info",
    message: `Initializing wallet subscription worker with cron pattern: ${cronPattern}`,
  });

  WalletSubscriptionQueue.q.add("cron", "", {
    repeat: { pattern: cronPattern },
    jobId: "wallet-subscription-cron",
  });

  const _worker = new Worker(WalletSubscriptionQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

/**
 * Process all wallet subscriptions and notify webhooks when conditions are met.
 */
const handler: Processor<string, void, string> = async (_job: Job<string>) => {
  // Get all active wallet subscriptions
  const subscriptions = await getAllWalletSubscriptions();
  if (subscriptions.length === 0) {
    return;
  }

  // Process in batches of 50
  const batches = chunk(subscriptions, 50);
  for (const batch of batches) {
    await processSubscriptions(batch);
  }
};
