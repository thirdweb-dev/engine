import { Job, Processor, Worker } from "bullmq";
import { Address } from "thirdweb";
import {
  lastUsedNonceKey,
  splitLastUsedNonceKey,
} from "../../db/wallets/walletNonce";
import {
  getLastUsedNonceKeys,
  getOnchainNonce,
} from "../../server/routes/admin/nonces";
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

// Interfaces
interface NonceState {
  timestamp: number;
  onchainNonce: number;
  internalNonce: number;
}

interface WalletHealth {
  walletAddress: Address;
  chainId: number;
  isStuck: boolean;
  onchainNonce: number;
  internalNonce: number;
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
  await checkAllWallets(job);
};

// Check all wallets
async function checkAllWallets(job: Job<string>) {
  const lastUsedNonceKeys = await getLastUsedNonceKeys();
  const walletHealthPromises = lastUsedNonceKeys.map(async (key) => {
    const { chainId, walletAddress } = splitLastUsedNonceKey(key);
    await updateNonceHistory(walletAddress, chainId);
    const isStuck = await isQueueStuck(walletAddress, chainId);
    const currentState = await getCurrentNonceState(walletAddress, chainId);
    return {
      walletAddress,
      chainId,
      isStuck,
      onchainNonce: currentState.onchainNonce,
      internalNonce: currentState.internalNonce,
    };
  });

  const walletHealthResults = await Promise.all(walletHealthPromises);
  logWalletHealth(walletHealthResults, job);
}

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

  // if for every period, the nonce is stuck, then the queue is stuck
  const isStuckForAllPeriods = historicalStates.every((state, index) => {
    if (index === historicalStates.length - 1) return true; // Last (oldest) state
    const nextState = historicalStates[index + 1];
    return (
      state.onchainNonce === nextState.onchainNonce &&
      state.internalNonce > nextState.internalNonce
    );
  });

  return isStuckForAllPeriods;
}

// Get current nonce state
async function getCurrentNonceState(
  walletAddress: Address,
  chainId: number,
): Promise<NonceState> {
  const [onchainNonce, internalNonce] = await Promise.all([
    getOnchainNonce(chainId, walletAddress),
    redis.get(lastUsedNonceKey(chainId, walletAddress)),
  ]);

  return {
    timestamp: Date.now(),
    onchainNonce: parseInt(onchainNonce.toString()),
    internalNonce: parseInt(internalNonce || "0"),
  };
}

function nonceHistoryKey(walletAddress: Address, chainId: number) {
  return `nonceHistory:${chainId}:${walletAddress}`;
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

// Log wallet health
function logWalletHealth(healthResults: WalletHealth[], job: Job<string>) {
  healthResults.forEach((result) => {
    const message =
      `[WALLET_HEALTH] ${result.walletAddress}:${result.chainId} ` +
      `isStuck:${result.isStuck} ` +
      `onchainNonce:${result.onchainNonce} ` +
      `internalNonce:${result.internalNonce}`;

    if (result.isStuck) {
      logger({
        service: "worker",
        level: "warn",
        message: `ALERT: ${message}`,
      });
    } else {
      logger({ service: "worker", level: "info", message });
    }
  });

  job.log(JSON.stringify(healthResults));
}
