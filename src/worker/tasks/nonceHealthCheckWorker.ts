import { Worker, type Job, type Processor } from "bullmq";
import { getAddress, type Address } from "thirdweb";
import {
  getUsedBackendWallets,
  inspectNonce,
} from "../../db/wallets/walletNonce";
import { getLastUsedOnchainNonce } from "../../server/routes/admin/nonces";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { NonceHealthCheckQueue } from "../queues/nonceHealthCheckQueue";
import { logWorkerExceptions } from "../queues/queues";

// Configuration

// Number of consecutive periods to check
// Checking over multiple periods helps to avoid false positives due to timing issues
const CHECK_PERIODS = 3;

// Frequency of the worker
const RUN_FREQUENCY_SECONDS = 60; // Run every minute

// The number of wallets to check in parallel.
const BATCH_SIZE = 500;

// Interfaces
interface NonceState {
  onchainNonce: number;
  largestSentNonce: number;
}

interface WalletHealth {
  walletAddress: Address;
  chainId: number;
  isStuck: boolean;
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
const handler: Processor<any, void, string> = async (job: Job<string>) => {
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
          level: isStuck ? "fatal" : "info",
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

  // if for every period, the onchain nonce has not changed, and the internal nonce has strictly increased
  // then the queue is stuck
  const isStuckForAllPeriods = historicalStates.every((state, index) => {
    if (index === historicalStates.length - 1) return true; // Last (oldest) state

    const prevState = historicalStates[index + 1];
    return (
      state.onchainNonce === prevState.onchainNonce &&
      state.largestSentNonce > prevState.largestSentNonce
    );
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

// Get historical nonce states
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
