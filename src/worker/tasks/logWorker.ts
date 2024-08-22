import { Job, Processor, Worker } from "bullmq";
import {
  lastUsedNonceKey,
  recycledNoncesKey,
  sentNoncesKey,
  splitLastUsedNonceKey,
} from "../../db/wallets/walletNonce";
import {
  getLastUsedNonceKeys,
  getOnchainNonce,
} from "../../server/routes/admin/nonces";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { LogQueue } from "../queues/logQueue";
import { logWorkerExceptions } from "../queues/queues";

// Configuration
const config = {
  runFrequencySeconds: 10,
  historyLengthMinutes: 60,
  recentHistoryLengthMinutes: 10,
  stuckThresholdMinutes: 10,
};

// Derived constants
const HISTORY_LENGTH = Math.floor(
  (config.historyLengthMinutes * 60) / config.runFrequencySeconds,
);
const RECENT_HISTORY_LENGTH = Math.floor(
  (config.recentHistoryLengthMinutes * 60) / config.runFrequencySeconds,
);
const STUCK_THRESHOLD = config.stuckThresholdMinutes * 60 * 1000; // milliseconds

// Interfaces
interface WalletNonceDetails {
  walletAddress: string;
  onchainNonce: string;
  lastUsedNonce: string;
  sentNoncesLength: number;
  recycledNoncesLength: number;
  chainId: number;
}

interface TimestampedWalletNonceDetails extends WalletNonceDetails {
  timestamp: number;
}
interface WalletHealthStatus extends TimestampedWalletNonceDetails {
  healthScore: number;
  alert: boolean;
  isStuck: boolean;
  metrics: {
    nonceDifference: number;
    nonceDifferenceTrend: number;
    sentNoncesTrend: number;
    recycledNoncesTrend: number;
    clearanceRate: number;
    transactionRate: number;
  };
}

// Initialize the log worker
export const initLogWorker = () => {
  LogQueue.q.add("cron", "", {
    repeat: { pattern: `*/${config.runFrequencySeconds} * * * * *` },
    jobId: "log-cron",
  });

  const _worker = new Worker(LogQueue.q.name, handler, {
    connection: redis,
    concurrency: 1,
  });
  logWorkerExceptions(_worker);
};

// Main handler function
const handler: Processor<any, void, string> = async (job: Job<string>) => {
  await checkWalletHealth(job);
};

// Check wallet health
async function checkWalletHealth(job: Job<string>): Promise<void> {
  const currentDetails = await getNonceDetails();
  const timestamp = Date.now();
  const timestampedDetails = currentDetails.map((d) => ({ ...d, timestamp }));

  await updateHistory(timestampedDetails);
  const history = await getHistory();

  const healthStatuses = timestampedDetails.map((details) => {
    const walletHistory = history.filter(
      (h) =>
        h.walletAddress === details.walletAddress &&
        h.chainId === details.chainId,
    );
    return calculateWalletHealth(details, walletHistory);
  });

  healthStatuses.forEach((status) => logHealthStatus(status, job));
}

// Update historical data
async function updateHistory(
  currentDetails: TimestampedWalletNonceDetails[],
): Promise<void> {
  const historyEntry = JSON.stringify({
    timestamp: Date.now(),
    details: currentDetails,
  });
  await redis.lpush("walletHealthHistory", historyEntry);
  await redis.ltrim("walletHealthHistory", 0, HISTORY_LENGTH - 1);
}

// Retrieve historical data
async function getHistory(): Promise<TimestampedWalletNonceDetails[]> {
  const historyData = await redis.lrange("walletHealthHistory", 0, -1);
  return historyData.flatMap((entry) => {
    const { details } = JSON.parse(entry) as {
      details: TimestampedWalletNonceDetails[];
    };
    return details;
  });
}

// Calculate wallet health
function calculateWalletHealth(
  currentDetails: TimestampedWalletNonceDetails,
  walletHistory: TimestampedWalletNonceDetails[],
): WalletHealthStatus {
  const recentHistory = walletHistory.slice(0, RECENT_HISTORY_LENGTH);
  const metrics = calculateMetrics(currentDetails, recentHistory);
  const isStuck = checkIfStuck(currentDetails, recentHistory);
  const healthScore = calculateHealthScore(metrics, isStuck);
  const alert = shouldAlert(healthScore, metrics, isStuck);

  return {
    ...currentDetails,
    healthScore,
    alert,
    isStuck,
    metrics,
  };
}
// Calculate health metrics
function calculateMetrics(
  currentDetails: TimestampedWalletNonceDetails,
  history: TimestampedWalletNonceDetails[],
) {
  const nonceDifference =
    parseInt(currentDetails.lastUsedNonce) -
    parseInt(currentDetails.onchainNonce);
  const nonceDifferenceTrend = calculateTrend(
    history,
    (d) => parseInt(d.lastUsedNonce) - parseInt(d.onchainNonce),
  );
  const sentNoncesTrend = calculateTrend(history, (d) => d.sentNoncesLength);
  const recycledNoncesTrend = calculateTrend(
    history,
    (d) => d.recycledNoncesLength,
  );
  const { clearanceRate, transactionRate } = calculateRates(
    currentDetails,
    history,
  );

  return {
    nonceDifference,
    nonceDifferenceTrend,
    sentNoncesTrend,
    recycledNoncesTrend,
    clearanceRate,
    transactionRate,
  };
}

// Calculate trend
function calculateTrend(
  history: TimestampedWalletNonceDetails[],
  getValue: (d: TimestampedWalletNonceDetails) => number,
): number {
  if (history.length < 2) return 0;
  const values = history.map(getValue);
  const oldestValue = values[values.length - 1];
  const newestValue = values[0];
  const timeDiffMinutes =
    (history[0].timestamp - history[history.length - 1].timestamp) /
    (60 * 1000);

  if (oldestValue === 0) return 0; // Avoid division by zero
  return Math.round(
    ((newestValue - oldestValue) / oldestValue) * (100 / timeDiffMinutes),
  );
}

// Calculate clearance and transaction rates
function calculateRates(
  currentDetails: TimestampedWalletNonceDetails,
  history: TimestampedWalletNonceDetails[],
): { clearanceRate: number; transactionRate: number } {
  if (history.length < 2) return { clearanceRate: 100, transactionRate: 0 };

  const oldestState = history[history.length - 1];
  const timeElapsedMinutes =
    (currentDetails.timestamp - oldestState.timestamp) / (60 * 1000);

  const newTransactions =
    parseInt(currentDetails.lastUsedNonce) -
    parseInt(oldestState.lastUsedNonce) +
    (oldestState.recycledNoncesLength - currentDetails.recycledNoncesLength);
  const clearedTransactions =
    parseInt(currentDetails.onchainNonce) - parseInt(oldestState.onchainNonce);

  const clearanceRate =
    newTransactions === 0
      ? 100
      : Math.round((clearedTransactions / newTransactions) * 100);
  const transactionRate = Math.round(newTransactions / timeElapsedMinutes);

  return { clearanceRate, transactionRate };
}

// Check if the wallet is stuck
function checkIfStuck(
  currentDetails: TimestampedWalletNonceDetails,
  history: TimestampedWalletNonceDetails[],
): boolean {
  if (history.length < 2) return false;

  const oldestState = history[history.length - 1];
  const timeElapsed = currentDetails.timestamp - oldestState.timestamp;

  return (
    timeElapsed >= STUCK_THRESHOLD &&
    currentDetails.onchainNonce === oldestState.onchainNonce &&
    parseInt(currentDetails.lastUsedNonce) >
      parseInt(currentDetails.onchainNonce)
  );
}

// Calculate health score
function calculateHealthScore(
  metrics: WalletHealthStatus["metrics"],
  isStuck: boolean,
): number {
  let score = 100;

  // Penalize based on nonce difference trend
  if (metrics.nonceDifferenceTrend > 0) {
    score -= Math.min(30, metrics.nonceDifferenceTrend);
  }

  // Penalize based on recycled nonces trend
  if (metrics.recycledNoncesTrend > 0) {
    score -= Math.min(20, metrics.recycledNoncesTrend * 2);
  }

  // Penalize based on clearance rate
  if (metrics.clearanceRate < 100) {
    score -= Math.min(30, (100 - metrics.clearanceRate) / 2);
  }

  // Penalize heavily if nonce difference is very high
  if (metrics.nonceDifference > 100) {
    score -= Math.min(50, metrics.nonceDifference / 2);
  }

  // Major penalty if stuck
  if (isStuck) {
    score -= 50;
  }

  return Math.max(0, Math.round(score));
}

// Determine if an alert should be triggered
function shouldAlert(
  healthScore: number,
  metrics: WalletHealthStatus["metrics"],
  isStuck: boolean,
): boolean {
  if (healthScore < 50) return true;
  if (metrics.nonceDifferenceTrend > 20) return true;
  if (metrics.recycledNoncesTrend > 10) return true;
  if (metrics.clearanceRate < 30) return true;
  if (metrics.nonceDifference > 200) return true;
  if (isStuck) return true;
  return false;
}

// Log health status
function logHealthStatus(
  healthStatus: WalletHealthStatus,
  job: Job<string>,
): void {
  const { walletAddress, chainId, healthScore, isStuck, metrics } =
    healthStatus;
  const message =
    `[WALLET_HEALTH] ${walletAddress}:${chainId} ` +
    `healthScore:${healthScore} ` +
    `nonceDiff:${metrics.nonceDifference} ` +
    `nonceDiffTrend:${metrics.nonceDifferenceTrend}%/min ` +
    `clearanceRate:${metrics.clearanceRate}% ` +
    `transactionRate:${metrics.transactionRate}/min ` +
    `recycledTrend:${metrics.recycledNoncesTrend}%/min ` +
    `isStuck:${isStuck}`;

  if (healthStatus.alert) {
    logger({ service: "worker", level: "warn", message: `ALERT: ${message}` });
  } else {
    logger({ service: "worker", level: "info", message });
  }

  job.log(JSON.stringify(healthStatus));
}

// Get nonce details
const getNonceDetails = async ({
  walletAddress,
  chainId,
}: {
  walletAddress?: string;
  chainId?: string;
} = {}): Promise<WalletNonceDetails[]> => {
  const lastUsedNonceKeys = await getLastUsedNonceKeys(walletAddress, chainId);

  const result = await Promise.all(
    lastUsedNonceKeys.map(async (key) => {
      const { chainId, walletAddress } = splitLastUsedNonceKey(key);

      const [
        lastUsedNonce,
        sentNoncesLength,
        recycledNoncesLength,
        onchainNonce,
      ] = await Promise.all([
        redis.get(lastUsedNonceKey(chainId, walletAddress)),
        redis.scard(sentNoncesKey(chainId, walletAddress)),
        redis.scard(recycledNoncesKey(chainId, walletAddress)),
        getOnchainNonce(chainId, walletAddress),
      ]);

      return {
        walletAddress,
        onchainNonce: onchainNonce.toString(),
        lastUsedNonce: lastUsedNonce ?? "0",
        sentNoncesLength,
        recycledNoncesLength,
        chainId,
      };
    }),
  );

  return result;
};
