import { type Job, type Processor, Worker } from "bullmq";
import { getAllBalanceSubscriptions } from "../../shared/db/balance-subscriptions/get-all-balance-subscriptions";
import { getConfig } from "../../shared/utils/cache/get-config";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import { BalanceSubscriptionQueue } from "../queues/balance-subscription-queue";
import { logWorkerExceptions } from "../queues/queues";
import { SendWebhookQueue } from "../queues/send-webhook-queue";
import {
  WebhooksEventTypes,
  type BalanceSubscriptionWebhookParams,
} from "../../shared/schemas/webhooks";
import { parseBalanceSubscriptionConfig } from "../../shared/schemas/balance-subscription-config";
import { getChain } from "../../shared/utils/chain";
import { thirdwebClient } from "../../shared/utils/sdk";
import { maxUint256 } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";

// Split array into chunks of specified size
function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );
}

// Must be explicitly called for the worker to run on this host.
export const initBalanceSubscriptionWorker = async () => {
  const config = await getConfig();
  const cronPattern =
    config.balanceSubscriptionsCronSchedule || "*/2 * * * * *"; // Default to every 30 seconds

  logger({
    service: "worker",
    level: "info",
    message: `Initializing balance subscription worker with cron pattern: ${cronPattern}`,
  });

  BalanceSubscriptionQueue.q.add("cron", "", {
    repeat: { pattern: cronPattern },
    jobId: "balance-subscription-cron",
  });

  const _worker = new Worker(BalanceSubscriptionQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

/**
 * Process all balance subscriptions and notify webhooks of changes.
 */
const handler: Processor<string, void, string> = async (job: Job<string>) => {
  // Get all active balance subscriptions
  const subscriptions = await getAllBalanceSubscriptions();
  if (subscriptions.length === 0) {
    return;
  }

  // Process in batches of 50
  const batches = chunk(subscriptions, 50);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async (subscription) => {
        try {
          // Get the current balance
          let currentBalance: bigint;
          const chain = await getChain(Number.parseInt(subscription.chainId));

          const currentBalanceResponse = await getWalletBalance({
            address: subscription.walletAddress,
            client: thirdwebClient,
            tokenAddress: subscription.tokenAddress ?? undefined, // get ERC20 balance if token address is provided
            chain,
          });

          currentBalance = currentBalanceResponse.value;

          const max = subscription.config.threshold?.max
            ? BigInt(subscription.config.threshold.max)
            : 0n; // If no max set, use 0 (always below current)
          const min = subscription.config.threshold?.min
            ? BigInt(subscription.config.threshold.min)
            : maxUint256; // If no min set, use max uint256 (always above current)

          if (currentBalance <= max && currentBalance >= min) {
            return;
          }

          // If there's a webhook, queue notification
          if (subscription.webhookId && subscription.webhook) {
            const webhookBody: BalanceSubscriptionWebhookParams = {
              subscriptionId: subscription.id,
              chainId: subscription.chainId,
              tokenAddress: subscription.tokenAddress,
              walletAddress: subscription.walletAddress,
              balance: currentBalance.toString(),
              config: parseBalanceSubscriptionConfig(subscription.config),
            };

            await SendWebhookQueue.enqueueWebhook({
              type: WebhooksEventTypes.BALANCE_SUBSCRIPTION,
              webhook: subscription.webhook,
              body: webhookBody,
            });
          }
        } catch (error) {
          // Log error but continue processing other subscriptions
          const message =
            error instanceof Error ? error.message : String(error);
          job.log(
            `Error processing subscription ${subscription.id}: ${message}`,
          );
          logger({
            service: "worker",
            level: "error",
            message: `Error processing balance subscription: ${message}`,
            error: error as Error,
          });
        }
      }),
    );
  }
};
