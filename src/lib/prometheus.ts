import { Counter, Gauge, Histogram, Registry } from "prom-client";
// import {
//   getUsedBackendWallets,
//   inspectNonce,
// } from "./db/wallets/wallet-nonce.js";
// import { getLastUsedOnchainNonce } from "../../server/routes/admin/nonces.js";

// const nonceMetrics = new Gauge({
//   name: "engine_nonces",
//   help: "Current nonce values and health for backend wallets",
//   labelNames: ["wallet_address", "chain_id", "nonce_type"] as const,
//   async collect() {
//     const allWallets = await getUsedBackendWallets();

//     for (const { chainId, walletAddress } of allWallets) {
//       const [onchainNonce, engineNonce] = await Promise.all([
//         getLastUsedOnchainNonce(chainId, walletAddress),
//         inspectNonce(chainId, walletAddress),
//       ]);

//       this.set(
//         {
//           wallet_address: walletAddress,
//           chain_id: chainId.toString(),
//           nonce_type: "onchain",
//         },
//         onchainNonce,
//       );
//       this.set(
//         {
//           wallet_address: walletAddress,
//           chain_id: chainId.toString(),
//           nonce_type: "engine",
//         },
//         engineNonce,
//       );
//     }
//   },
// });

export const enginePromRegister = new Registry();

// enginePromRegister.registerMetric(nonceMetrics);

// Define strict types for each event
type ResponseSentParams = {
  endpoint: string;
  statusCode: string;
  method: string;
  duration: number;
};

type TransactionQueuedParams = {
  chainId: string;
  walletAddress: string;
};

type TransactionSentParams = TransactionQueuedParams & {
  success: boolean;
  durationSeconds: number;
};

type TransactionMinedParams = TransactionQueuedParams & {
  queuedToMinedDurationSeconds: number;
  durationSeconds: number;
};

// Union type for all possible event parameters
type MetricParams =
  | { event: "response_sent"; params: ResponseSentParams }
  | { event: "transaction_queued"; params: TransactionQueuedParams }
  | { event: "transaction_sent"; params: TransactionSentParams }
  | { event: "transaction_mined"; params: TransactionMinedParams };

// Request metrics
const requestsTotal = new Counter({
  name: "engine_requests_total",
  help: "Total number of completed requests",
  labelNames: ["endpoint", "status_code", "method"],
  registers: [enginePromRegister],
});

const requestDuration = new Histogram({
  name: "engine_response_time_ms",
  help: "Response time in milliseconds",
  labelNames: ["endpoint", "status_code", "method"],
  buckets: [1, 10, 50, 100, 300, 500, 700, 1000, 3000, 5000, 7000, 10_000],
  registers: [enginePromRegister],
});

// Transaction metrics
const transactionsQueued = new Gauge({
  name: "engine_transactions_queued",
  help: "Number of transactions currently in queue",
  labelNames: ["chain_id", "wallet_address"] as const,
  registers: [enginePromRegister],
});

const transactionsQueuedTotal = new Counter({
  name: "engine_transactions_queued_total",
  help: "Total number of transactions queued",
  labelNames: ["chain_id", "wallet_address"] as const,
  registers: [enginePromRegister],
});

const transactionsSentTotal = new Counter({
  name: "engine_transactions_sent_total",
  help: "Total number of transactions sent",
  labelNames: ["chain_id", "wallet_address", "is_success"] as const,
  registers: [enginePromRegister],
});

const transactionsMinedTotal = new Counter({
  name: "engine_transactions_mined_total",
  help: "Total number of transactions mined",
  labelNames: ["chain_id", "wallet_address"] as const,
  registers: [enginePromRegister],
});

// Transaction duration histograms
const queuedToSentDuration = new Histogram({
  name: "engine_transaction_queued_to_sent_seconds",
  help: "Duration from queued to sent in seconds",
  labelNames: ["chain_id", "wallet_address"] as const,
  buckets: [
    0.05, // 50ms
    0.1, // 100ms
    0.5, // 500ms
    1, // 1s
    5, // 5s
    15, // 15s
    30, // 30s
    60, // 1m
    300, // 5m
    600, // 10m
    1800, // 30m
    3600, // 1h
    7200, // 2h
    21600, // 6h
    43200, // 12h
  ],
  registers: [enginePromRegister],
});

const sentToMinedDuration = new Histogram({
  name: "engine_transaction_sent_to_mined_seconds",
  help: "Duration from sent to mined in seconds",
  labelNames: ["chain_id", "wallet_address"] as const,
  buckets: [
    0.2, // 200ms
    0.5, // 500ms
    1, // 1s
    5, // 5s
    10, // 10s
    30, // 30s
    60, // 1m
    120, // 2m
    300, // 5m
    600, // 10m
    900, // 15m
    1200, // 20m
    1800, // 30m
  ],
  registers: [enginePromRegister],
});

const queuedToMinedDuration = new Histogram({
  name: "engine_transaction_queued_to_mined_seconds",
  help: "Duration from queued to mined in seconds",
  labelNames: ["chain_id", "wallet_address"] as const,
  buckets: [
    0.2, // 200ms
    0.5, // 500ms
    1, // 1s
    5, // 5s
    15, // 15s
    30, // 30s
    60, // 1m
    300, // 5m
    600, // 10m
    1800, // 30m
    3600, // 1h
    7200, // 2h
    21600, // 6h
    43200, // 12h
  ],
  registers: [enginePromRegister],
});

// Function to record metrics
export function recordMetrics(eventData: MetricParams): void {
  const { event, params } = eventData;
  switch (event) {
    case "response_sent": {
      const labels = {
        endpoint: params.endpoint,
        status_code: params.statusCode,
      };
      requestsTotal.inc(labels);
      requestDuration.observe(labels, params.duration);
      break;
    }

    case "transaction_queued": {
      const labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsQueued.inc(labels);
      transactionsQueuedTotal.inc(labels);
      break;
    }

    case "transaction_sent": {
      const labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsQueued.dec(labels);
      transactionsSentTotal.inc({ ...labels, is_success: `${params.success}` });
      queuedToSentDuration.observe(labels, params.durationSeconds);
      break;
    }

    case "transaction_mined": {
      const labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsMinedTotal.inc(labels);
      sentToMinedDuration.observe(labels, params.durationSeconds);
      queuedToMinedDuration.observe(
        labels,
        params.queuedToMinedDurationSeconds,
      );
      break;
    }
  }
}
