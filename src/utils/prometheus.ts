import { Counter, Gauge, Histogram, Registry } from "prom-client";
import { getUsedBackendWallets, inspectNonce } from "../db/wallets/walletNonce";
import { getLastUsedOnchainNonce } from "../server/routes/admin/nonces";

const nonceMetrics = new Gauge({
  name: "engine_nonces",
  help: "Current nonce values and health for backend wallets",
  labelNames: ["wallet_address", "chain_id", "nonce_type"],
  async collect() {
    const allWallets = await getUsedBackendWallets();

    for (const { chainId, walletAddress } of allWallets) {
      const [onchainNonce, engineNonce] = await Promise.all([
        getLastUsedOnchainNonce(chainId, walletAddress),
        inspectNonce(chainId, walletAddress),
      ]);

      this.set(
        {
          wallet_address: walletAddress,
          chain_id: chainId.toString(),
          nonce_type: "onchain",
        },
        onchainNonce,
      );
      this.set(
        {
          wallet_address: walletAddress,
          chain_id: chainId.toString(),
          nonce_type: "engine",
        },
        engineNonce,
      );
    }
  },
});

export const enginePromRegister = new Registry();

enginePromRegister.registerMetric(nonceMetrics);

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
  duration: number;
};

type TransactionMinedParams = TransactionQueuedParams & {
  endToEndDuration: number;
  duration: number;
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
  buckets: [100, 300, 500, 700, 1000, 3000, 5000, 7000, 10_000],
  registers: [enginePromRegister],
});

// Transaction metrics
const transactionsQueued = new Gauge({
  name: "engine_transactions_queued",
  help: "Number of transactions currently in queue",
  labelNames: ["chain_id", "wallet_address"],
  registers: [enginePromRegister],
});

const transactionsQueuedTotal = new Counter({
  name: "engine_transactions_queued_total",
  help: "Total number of transactions queued",
  labelNames: ["chain_id", "wallet_address"],
  registers: [enginePromRegister],
});

const transactionsSentTotal = new Counter({
  name: "engine_transactions_sent_total",
  help: "Total number of transactions sent",
  labelNames: ["chain_id", "wallet_address", "is_success"],
  registers: [enginePromRegister],
});

const transactionsMinedTotal = new Counter({
  name: "engine_transactions_mined_total",
  help: "Total number of transactions mined",
  labelNames: ["chain_id", "wallet_address"],
  registers: [enginePromRegister],
});

// Transaction duration histograms
const queueToSentDuration = new Histogram({
  name: "engine_transaction_queue_to_sent_seconds",
  help: "Duration from queue to sent in seconds",
  labelNames: ["chain_id", "wallet_address"],
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  registers: [enginePromRegister],
});

const sentToMinedDuration = new Histogram({
  name: "engine_transaction_sent_to_mined_seconds",
  help: "Duration from sent to mined in seconds",
  labelNames: ["chain_id", "wallet_address"],
  buckets: [10, 30, 60, 120, 300, 600, 1200, 1800],
  registers: [enginePromRegister],
});

const endToEndDuration = new Histogram({
  name: "engine_transaction_end_to_end_seconds",
  help: "Duration from request to mined in seconds",
  labelNames: ["chain_id", "wallet_address"],
  buckets: [10, 30, 60, 120, 300, 600, 1200, 1800, 3600],
  registers: [enginePromRegister],
});

// Function to record metrics
export function recordMetrics(eventData: MetricParams): void {
  const { event, params } = eventData;
  let labels: any;
  switch (event) {
    case "response_sent":
      labels = {
        endpoint: params.endpoint,
        status_code: params.statusCode,
      };
      requestsTotal.inc(labels);
      requestDuration.observe(labels, params.duration);
      break;

    case "transaction_queued":
      labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsQueued.inc(labels);
      transactionsQueuedTotal.inc(labels);
      break;

    case "transaction_sent":
      labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsQueued.dec(labels);
      transactionsSentTotal.inc({ ...labels, is_success: params.success });
      queueToSentDuration.observe(labels, params.duration);
      break;

    case "transaction_mined":
      labels = {
        chain_id: params.chainId,
        wallet_address: params.walletAddress,
      };
      transactionsMinedTotal.inc(labels);
      sentToMinedDuration.observe(labels, params.duration);
      endToEndDuration.observe(labels, params.endToEndDuration);
      break;
  }
}
