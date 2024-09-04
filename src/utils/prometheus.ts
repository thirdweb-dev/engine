import { Counter, Gauge, Histogram, Pushgateway, Registry } from "prom-client";
import { env } from "./env";
import { logger } from "./logger";

const register = new Registry();
const pushgateway = env.PROMETHEUS_PUSHGATEWAY_URL
  ? new Pushgateway(env.PROMETHEUS_PUSHGATEWAY_URL, {}, register)
  : null;

// Define strict types for each event
type ResponseSentParams = {
  endpoint: string;
  statusCode: number;
  duration: number;
};

type TransactionQueuedParams = {
  extension: string;
  chainId: number;
};

type TransactionSentParams = TransactionQueuedParams & {
  success: boolean;
};

type TransactionMinedParams = TransactionQueuedParams & {
  mineTime: number;
};

// Union type for all possible event parameters
type MetricParams =
  | { event: "response_sent"; params: ResponseSentParams }
  | { event: "transaction_queued"; params: TransactionQueuedParams }
  | { event: "transaction_sent"; params: TransactionSentParams }
  | { event: "transaction_mined"; params: TransactionMinedParams };

// Define metrics
const requestCounter = new Counter({
  name: "engine_requests_total",
  help: "Total number of completed requests",
  labelNames: ["endpoint", "extension", "chainId", "provider", "status_code"],
  registers: [register],
});

const responseTimeHistogram = new Histogram({
  name: "engine_response_time_seconds",
  help: "Response time in seconds",
  labelNames: ["endpoint", "extension", "chainId", "provider", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

const transactionsQueued = new Gauge({
  name: "engine_transactions_queued",
  help: "Number of transactions currently in queue",
  labelNames: ["endpoint", "extension", "chainId", "provider"],
  registers: [register],
});

const transactionTimeHistogram = new Histogram({
  name: "engine_transaction_time_seconds",
  help: "Time for transaction to be mined",
  labelNames: ["endpoint", "extension", "chainId", "provider"],
  buckets: [10, 30, 60, 120, 300, 600, 1200, 1800],
  registers: [register],
});

// Function to record metrics
export function recordMetrics(eventData: MetricParams): void {
  if (!pushgateway) {
    return;
  }
  const { event, params } = eventData;

  const labels = {
    ...eventData.params,
    chainId:
      "chainId" in eventData.params
        ? eventData.params.chainId.toString()
        : undefined,
  };

  switch (event) {
    case "response_sent":
      requestCounter.inc({
        ...labels,
        status_code: params.statusCode.toString(),
      });
      responseTimeHistogram.observe(labels, params.duration);
      break;
    case "transaction_queued":
      transactionsQueued.inc(labels);
      break;
    case "transaction_sent":
      transactionsQueued.dec(labels);
      break;
    case "transaction_mined":
      transactionTimeHistogram.observe(labels, params.mineTime);
      break;
  }

  pushgateway.push({ jobName: "engine" }).catch((err) => {
    logger({
      service: "server",
      level: "error",
      message: "Failed to push metrics to Prometheus",
      data: { error: err },
    });
  });
}
