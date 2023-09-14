import { getBenchmarkConfiguration } from "./utils/config";
import { logger } from "./utils/logger";
import { awaitTx, sendTxs } from "./utils/transactions";

async function main() {
  const config = await getBenchmarkConfiguration();
  const txIds = await sendTxs(config);

  logger.info(
    "Waiting until all transactions are mined or errored. This may take several minutes.",
  );

  const txs = await Promise.all(
    txIds.map((txnId) => {
      return awaitTx({
        apiKey: config.apiKey,
        host: config.host,
        txnId,
      });
    }),
  );

  type Transaction = {
    timeTaken?: number;
    hash?: string;
    status: string;
  };

  const erroredTxs: Transaction[] = [];
  const submittedTxs: Transaction[] = [];
  const processedTxs: Transaction[] = [];
  const minedTxs: Transaction[] = [];

  txs.map((tx) => {
    switch (tx.status) {
      case "errored": {
        erroredTxs.push({
          status: tx.status,
        });
        break;
      }
      default: {
        if (tx.processedAt && tx.queuedAt) {
          processedTxs.push({
            status: tx.status!,
            timeTaken:
              new Date(tx.processedAt).getTime() -
              new Date(tx.queuedAt).getTime(),
            hash: tx.transactionHash,
          });
        }

        if (tx.sentAt && tx.queuedAt) {
          submittedTxs.push({
            status: tx.status!,
            timeTaken:
              new Date(tx.sentAt).getTime() - new Date(tx.queuedAt).getTime(),
            hash: tx.transactionHash,
          });
        }

        if (tx.minedAt && tx.queuedAt) {
          minedTxs.push({
            status: tx.status!,
            timeTaken:
              new Date(tx.minedAt).getTime() - new Date(tx.queuedAt).getTime(),
            hash: tx.transactionHash,
          });
        }
        break;
      }
    }
  });

  console.table({
    error: erroredTxs.length,
    processing: processedTxs.length,
    submittedToMempool: submittedTxs.length,
    minedTransaction: minedTxs.length,
  });

  processedTxs.sort((a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0));
  submittedTxs.sort((a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0));
  minedTxs.sort((a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0));

  console.table({
    "Mean Processing Time":
      processedTxs.reduce((acc, curr) => acc + (curr.timeTaken ?? 0), 0) /
        processedTxs.length /
        1_000 +
      " sec",
    "Median Processing Time":
      (processedTxs[Math.floor(processedTxs.length / 2)].timeTaken ?? 0) /
        1_000 +
      " sec",
    "Min Processing Time": (processedTxs[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Processing Time":
      (processedTxs[processedTxs.length - 1].timeTaken ?? 0) / 1_000 + " sec",
  });

  console.table({
    "Mean Submission Time":
      submittedTxs.reduce((acc, curr) => acc + (curr.timeTaken ?? 0), 0) /
        submittedTxs.length /
        1_000 +
      " sec",
    "Median Submission Time":
      (submittedTxs[Math.floor(submittedTxs.length / 2)].timeTaken ?? 0) /
        1_000 +
      " sec",
    "Min Submission Time": (submittedTxs[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Submission Time":
      (submittedTxs[submittedTxs.length - 1].timeTaken ?? 0) / 1_000 + " sec",
  });

  console.table({
    "Mean Mined Time":
      minedTxs.reduce((acc, curr) => acc + (curr.timeTaken ?? 0), 0) /
        minedTxs.length /
        1_000 +
      " sec",
    "Median Mined Time":
      (minedTxs[Math.floor(minedTxs.length / 2)].timeTaken ?? 0) / 1_000 +
      " sec",
    "Min Mined Time": (minedTxs[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Mined Time":
      (minedTxs[minedTxs.length - 1].timeTaken ?? 0) / 1_000 + " sec",
  });
}

main();
