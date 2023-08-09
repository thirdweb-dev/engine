import { Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import autocannon from "autocannon";
import * as dotenv from "dotenv";
import { env } from "process";
import { transactionResponseSchema } from "../../server/schemas/transaction";

dotenv.config({
  debug: true,
  override: true,
  path: ".env.benchmark",
});

function logInfo(msg: string) {
  console.log(`[INFO] ${msg}`);
}
function logError(msg: string) {
  console.error(`[ERROR] ${msg}`);
}

function getBenchmarkOpts() {
  if (!env.THIRDWEB_SDK_SECRET_KEY) {
    throw new Error("THIRDWEB_SDK_SECRET_KEY is not set");
  }
  const opts = {
    THIRDWEB_SDK_SECRET_KEY: env.THIRDWEB_SDK_SECRET_KEY,
    BENCHMARK_HOST: env.BENCHMARK_HOST ?? "http://127.0.0.1:3005",
    BENCHMARK_URL_PATH:
      env.BENCHMARK_URL_PATH ??
      "/contract/polygon/0x01De66609582B874FA34ab288859ACC4592aec04/write",
    BENCHMARK_POST_BODY:
      env.BENCHMARK_POST_BODY ??
      '{ "function_name": "grantRole", "args": ["0x0000000000000000000000000000000000000000000000000000000000000000", "0xcf3d06a19263976a540cff8e7be7b026801c52a6"]}',
    BENCHMARK_CONCURRENCY: parseInt(env.BENCHMARK_CONCURRENCY ?? "1"),
    BENCHMARK_REQUESTS: parseInt(env.BENCHMARK_REQUESTS ?? "1"),
  };
  return opts;
}

async function sendTransaction(opts: ReturnType<typeof getBenchmarkOpts>) {
  const txnIds: string[] = [];

  return new Promise<string[]>(async (resolve, reject) => {
    const instance = autocannon({
      url: `${opts.BENCHMARK_HOST}`,
      connections: opts.BENCHMARK_CONCURRENCY,
      amount: opts.BENCHMARK_REQUESTS,
      requests: [
        {
          path: opts.BENCHMARK_URL_PATH,
          headers: {
            authorization: `Bearer ${opts.THIRDWEB_SDK_SECRET_KEY}`,
            "content-type": "application/json",
          },
          method: "POST",
          body: opts.BENCHMARK_POST_BODY,
          // @ts-ignore: autocannon types are 3 minor versions behind.
          // This was one of the new field that was recently added
          onResponse: (status: number, body: string) => {
            if (status === 200) {
              const parsedResult: { result?: string } = JSON.parse(body);
              if (!parsedResult.result) {
                logError(
                  `Response body does not contain a "result" field: ${body}`,
                );
                return reject({
                  error: "Response body does not contain a 'result' field",
                });
              }
              txnIds.push(parsedResult.result);
            } else {
              logError(
                `Received status code ${status} from server. Body: ${body}`,
              );
              return reject({
                error: `Received status code ${status} from server.`,
              });
            }
          },
        },
      ],
    });

    autocannon.track(instance, {
      renderLatencyTable: false,
      renderResultsTable: false,
    });

    const result = autocannon.printResult(await instance);
    logInfo(result);
    resolve(txnIds);
  });
}

async function fetchStatus({
  txnId,
  host,
  apiKey,
}: {
  txnId: string;
  host: string;
  apiKey: string;
}) {
  const resp = await fetch(`${host}/transaction/status/${txnId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const raw = await resp.json();
  return raw.result;
}

function parseStatus(
  status: unknown,
): Static<typeof transactionResponseSchema> {
  const C = TypeCompiler.Compile(transactionResponseSchema);
  const isValue = C.Check(status);
  if (!isValue) {
    throw new Error(`Invalid response from server: ${status}`);
  }
  return status;
}

function sleep(timeInSeconds: number) {
  return new Promise((resolve) => setTimeout(resolve, timeInSeconds * 1_000));
}

async function processTransaction(
  txnIds: string[],
  opts: ReturnType<typeof getBenchmarkOpts>,
) {
  // give queue some time to process things
  await sleep(2);

  const statuses = await Promise.all(
    txnIds.map((txnId) => {
      return fetchStatus({
        apiKey: opts.THIRDWEB_SDK_SECRET_KEY,
        host: opts.BENCHMARK_HOST,
        txnId,
      });
    }),
  );

  const queuedTxn: Record<
    string,
    Static<typeof transactionResponseSchema>
  > = {};
  statuses.forEach((status) => {
    const parsedStatus = parseStatus(status);
    if (!parsedStatus.queueId) {
      throw new Error(`Missing queueId in status: ${status}`);
    }
    if (parsedStatus.status === "queued") {
      queuedTxn[parsedStatus.queueId] = status;
    }
  });
  while (Object.keys(queuedTxn).length > 0) {
    logInfo(
      `${
        Object.keys(queuedTxn).length
      } tranasctions have not been processed, waiting...`,
    );
    // give things time to process before spamming again.
    await sleep(6);
    const newStatuses = await Promise.all(
      Object.keys(queuedTxn).map(async (queueId) => {
        return fetchStatus({
          apiKey: opts.THIRDWEB_SDK_SECRET_KEY,
          host: opts.BENCHMARK_HOST,
          txnId: queueId,
        });
      }),
    );
    newStatuses.forEach((status) => {
      const parsedStatus = parseStatus(status);
      if (!parsedStatus.queueId) {
        throw new Error(`Missing queueId in status: ${status}`);
      }
      if (status.status !== "queued") {
        delete queuedTxn[status.queueId];
      }
      statuses.push(status);
    });
  }

  type txn = {
    timeTaken?: number;
    txnHash?: string;
    status: string;
  };
  const erroredTransaction: txn[] = [];
  const submittedTransaction: txn[] = [];
  const processedTransaction: txn[] = [];
  console.log("statuses", statuses);
  statuses.map((status) => {
    const parsedStatus = parseStatus(status);
    switch (parsedStatus.status) {
      case "errored": {
        erroredTransaction.push({
          status: parsedStatus.status,
        });
        break;
      }
      case "processed": {
        if (
          !parsedStatus.txProcessedTimestamp ||
          !parsedStatus.createdTimestamp
        ) {
          throw new Error(
            `Invalid response from server for status transaction: ${JSON.stringify(
              parsedStatus,
            )}`,
          );
        }
        processedTransaction.push({
          status: parsedStatus.status,
          timeTaken:
            new Date(parsedStatus.txProcessedTimestamp).getTime() -
            new Date(parsedStatus.createdTimestamp).getTime(),
        });
        break;
      }
      case "submitted": {
        if (
          !parsedStatus.txSubmittedTimestamp ||
          !parsedStatus.createdTimestamp
        ) {
          throw new Error(
            `Invalid response from server for submitted transaction: ${JSON.stringify(
              parsedStatus,
            )}`,
          );
        }
        submittedTransaction.push({
          status: parsedStatus.status,
          timeTaken:
            new Date(parsedStatus.txSubmittedTimestamp).getTime() -
            new Date(parsedStatus.createdTimestamp).getTime(),
          txnHash: parsedStatus.txHash,
        });
        break;
      }
      case "queued": {
        // old transactions
        break;
      }
      case "mined": {
        // not supported today
        break;
      }
      default: {
        throw new Error(`Invalid status: ${parsedStatus.status}`);
      }
    }
  });

  console.table({
    error: erroredTransaction.length,
    processing: processedTransaction.length,
    submittedToMempool: submittedTransaction.length,
  });

  const sortedSubmittedTransaction = submittedTransaction.sort(
    (a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0),
  );

  console.table({
    "Avg Submission Time":
      submittedTransaction.reduce(
        (acc, curr) => acc + (curr.timeTaken ?? 0),
        0,
      ) /
        submittedTransaction.length /
        1_000 +
      " sec",
    "Median Submission Time":
      (sortedSubmittedTransaction[Math.floor(submittedTransaction.length / 2)]
        .timeTaken ?? 0) /
        1_000 +
      " sec",
    "Min Submission Time":
      (sortedSubmittedTransaction[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Submission Time":
      (sortedSubmittedTransaction[sortedSubmittedTransaction.length - 1]
        .timeTaken ?? 0) /
        1_000 +
      " sec",
  });

  return {
    erroredTransaction,
    submittedTransaction,
    processedTransaction,
  };
}

function confirmTransaction() {}

function getBlockStats() {}

// async/await
async function runBenchmark() {
  const opts = getBenchmarkOpts();

  logInfo(
    `Benchmarking ${opts.BENCHMARK_HOST}${opts.BENCHMARK_URL_PATH} with ${opts.BENCHMARK_REQUESTS} requests and a concurrency of ${opts.BENCHMARK_CONCURRENCY}`,
  );
  logInfo("Sending transactions...");
  const txnIds = await sendTransaction(opts);

  logInfo("Checking time taken for submission to mempool");
  await processTransaction(txnIds, opts);
}

runBenchmark().catch((e) => {
  console.error("Error while running benchmark:");
  console.error(e);
  process.exit(1);
});
