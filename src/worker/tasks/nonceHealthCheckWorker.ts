import { Worker, type Job, type Processor } from "bullmq";
import { getAddress, type Address } from "thirdweb";
import {
  getUsedBackendWallets,
  inspectNonce,
} from "../../shared/db/wallets/walletNonce";
import { getLastUsedOnchainNonce } from "../../server/routes/admin/nonces";
import { logger } from "../../shared/utils/logger";
import { redis } from "../../shared/utils/redis/redis";
import { NonceHealthCheckQueue } from "../queues/nonceHealthCheckQueue";
import { logWorkerExceptions } from "../queues/queues";

// Configuration

// Number of consecutive periods to check
// Checking over multiple periods avoids false positives due to intermittent stale RPC responses.
const CHECK_PERIODS = 5;

// Frequency of the worker
const RUN_FREQUENCY_SECONDS = 60; // Run every minute

// The number of wallets to check in parallel.
const BATCH_SIZE = 500;

// Interfaces
interface NonceState {
  onchainNonce: number;
  largestSentNonce: number;
}
// Initialize the worker
export const initNonceHealthCheckWorker = () => {
  NonceHealthCheckQueue.q.add("cron", "", {
    repeat: { pattern: `*/${RUN_FREQUENCY_SECONDS} * * * * *` },
    jobId: "nonce-health-check-cron",
  });

  const _worker = new Worker(NonceHealthCheckQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

// Main handler function
const handler: Processor<null, void, string> = async (_job: Job<null>) => {
  const allWallets = await getUsedBackendWallets();

  for (let i = 0; i < allWallets.length; i += BATCH_SIZE) {
    const batch = allWallets.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ chainId, walletAddress }) => {
        const [_, isStuck, currentState] = await Promise.all([
          updateNonceHistory(walletAddress, chainId),
          isQueueStuck(walletAddress, chainId),
          getCurrentNonceState(walletAddress, chainId),
        ]);

        logger({
          service: "worker",
          level: isStuck ? "fatal" : "debug",
          message: `[WALLET_HEALTH] ${walletAddress}:${chainId} isStuck:${isStuck} onchainNonce:${currentState.onchainNonce} largestSentNonce:${currentState.largestSentNonce}`,
        });
      }),
    );

    await sleep(500);
  }
};

// Check if a queue is stuck
async function isQueueStuck(
  walletAddress: Address,
  chainId: number,
): Promise<boolean> {
  const historicalStates = await getHistoricalNonceStates(
    walletAddress,
    chainId,
    CHECK_PERIODS,
  );

  // ensure we have enough data to check
  if (historicalStates.length < CHECK_PERIODS) return false;

  const oldestOnchainNonce = historicalStates.at(-1)?.onchainNonce;

  // if for every period, the onchain nonce has not changed, and the internal nonce has strictly increased
  // then the queue is stuck
  const isStuckForAllPeriods = historicalStates.every((state, index) => {
    // check if the onchain nonce has changed, if yes, fail the check early
    if (state.onchainNonce !== oldestOnchainNonce) return false;

    // if the current state is the oldest state, we don't need to check if engine nonce has increased
    if (index === historicalStates.length - 1) return true;

    const previousState = historicalStates[index + 1];
    return state.largestSentNonce > previousState.largestSentNonce;
  });

  return isStuckForAllPeriods;
}

// Get current nonce state
async function getCurrentNonceState(
  walletAddress: Address,
  chainId: number,
): Promise<NonceState> {
  const [onchainNonce, largestSentNonce] = await Promise.all([
    getLastUsedOnchainNonce(chainId, walletAddress),
    inspectNonce(chainId, walletAddress),
  ]);

  return {
    onchainNonce: onchainNonce,
    largestSentNonce: largestSentNonce,
  };
}

function nonceHistoryKey(walletAddress: Address, chainId: number) {
  return `nonce-history:${chainId}:${getAddress(walletAddress)}`;
}

/**
 * Get historical nonce states, ordered from newest to oldest
 */
async function getHistoricalNonceStates(
  walletAddress: Address,
  chainId: number,
  periods: number,
): Promise<NonceState[]> {
  const key = nonceHistoryKey(walletAddress, chainId);
  const historicalStates = await redis.lrange(key, 0, periods - 1);
  return historicalStates.map((state) => JSON.parse(state));
}

// Update nonce history
async function updateNonceHistory(walletAddress: Address, chainId: number) {
  const currentState = await getCurrentNonceState(walletAddress, chainId);
  const key = nonceHistoryKey(walletAddress, chainId);

  await redis
    .multi()
    .lpush(key, JSON.stringify(currentState))
    .ltrim(key, 0, CHECK_PERIODS - 1)
    .exec();
}

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms, null));
