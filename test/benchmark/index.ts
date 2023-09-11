import { Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import autocannon from "autocannon";
import dotenv from "dotenv";
import { transactionResponseSchema } from "../../server/schemas/transaction";

type BenchmarkConfiguration = {
  apiKey: string;
  host: string;
  path: string;
  body: string;
  requests: number;
  concurrency: number;
};

dotenv.config({
  debug: true,
  override: true,
  path: ".env.benchmark",
});

const logger = {
  info(message: string) {
    console.log(`\n[INFO] ${message}\n`);
  },
  error(message: string) {
    console.log(`\n[ERROR] ${message}\n`);
  },
};

function requireEnv(varName: string) {
  const val = process.env[varName];
  if (!val) {
    throw new Error(`Please set the ${varName} environment variable`);
  }

  return val;
}

async function request(
  config: { host: string; apiKey: string },
  path: string,
  method: string,
  body: string,
) {
  try {
    const res = await fetch(`${config.host}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
    });
    return res.json();
  } catch (err) {
    console.log(err);
    throw new Error("Fetch failed...");
  }
}

async function getBenchmarkConfiguration(): Promise<BenchmarkConfiguration> {
  const benchmarkConfig = {
    apiKey: requireEnv("THIRDWEB_API_SECRET_KEY"),
    host: process.env.BENCHMARK_HOST ?? `http://127.0.0.1:3005`,
    requests: parseInt(requireEnv("BENCHMARK_REQUESTS") ?? 100),
    concurrency: parseInt(requireEnv("BENCHMARK_CONCURRENCY") ?? 10),
  };

  if (process.env.BENCHMARK_PATH || process.env.BENCHMARK_BODY) {
    requireEnv("BENCHMARK_PATH");
    requireEnv("BENCMARK_BODY");

    return {
      ...benchmarkConfig,
      path: process.env.BENCHMARK_PATH!,
      body: process.env.BENCHMARK_BODY!,
    };
  }

  const chain = requireEnv("BENCHMARK_CHAIN");

  // TODO: Make this active wallet
  const adminAddress = "0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC";

  let contractAddress: string;
  let functionName: string = "mintTo";
  let functionArgs: string = `["0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC", "1000000000"]`;

  if (
    process.env.BENCHMARK_CONTRACT_ADDRESS ||
    process.env.BENCHMARK_FUNCTION_NAME ||
    process.env.BENCHMARK_FUNCTION_ARGS
  ) {
    requireEnv("BENCHMARK_CONTRACT_ADDRESS");
    requireEnv("BENCHMARK_FUNCTION_NAME");
    requireEnv("BENCHMARK_FUNCTION_ARGS");

    contractAddress = requireEnv("BENCHMARK_CONTRACT_ADDRESS");
    functionName = requireEnv("BENCHMARK_FUNCTION_NAME");
    functionArgs = requireEnv("BENCHMARK_FUNCTION_ARGS");
  } else {
    logger.info(
      `No BENCHMARK_CONTRACT_ADDRESS environment variable configured. Deploying a new contract to run benchmarks against.`,
    );

    const {
      result: { queuedId, deployedAddress },
    } = await request(
      benchmarkConfig,
      `/deployer/${chain}/prebuilts/token`,
      "POST",
      JSON.stringify({
        contractMetadata: {
          name: "Benchmark Token",
          description:
            "This token contract was deployed for benchmark testing.",
          platform_fee_basis_points: 0,
          platform_fee_recipient: adminAddress,
          primary_sale_recipient: adminAddress,
        },
      }),
    );

    await awaitTx({
      host: benchmarkConfig.host,
      apiKey: benchmarkConfig.apiKey,
      txnId: queuedId,
    });

    contractAddress = deployedAddress;

    logger.info(
      `Successully deployed contract ${contractAddress} for benchmark testing.`,
    );
  }

  return {
    ...benchmarkConfig,
    path: `/contract/${chain}/${contractAddress}/write`,
    body: JSON.stringify({
      function_name: functionName,
      args: JSON.parse(functionArgs),
    }),
  };
}

async function sendTransactions(config: BenchmarkConfiguration) {
  const txnIds: string[] = [];

  return new Promise<string[]>(async (resolve, reject) => {
    const requests = autocannon({
      url: config.host,
      connections: config.concurrency,
      amount: config.requests,
      requests: [
        {
          path: config.path,
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          method: "POST",
          body: config.body,
          // @ts-ignore: autocannon types are 3 minor versions behind.
          // This was one of the new field that was recently added
          onResponse: (status: number, body: string) => {
            if (status === 200) {
              const parsedResult: { result?: string } = JSON.parse(body);
              if (!parsedResult.result) {
                logger.error(
                  `Response body does not contain a "result" field: ${body}`,
                );
                return reject({
                  error: "Response body does not contain a 'result' field",
                });
              }
              txnIds.push(parsedResult.result);
            } else {
              logger.error(
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

    autocannon.track(requests, {
      renderLatencyTable: false,
      renderResultsTable: false,
    });

    const result = autocannon.printResult(await requests);
    logger.info(result);
    resolve(txnIds);
  });
}

function sleep(timeInSeconds: number) {
  return new Promise((resolve) => setTimeout(resolve, timeInSeconds * 1_000));
}

async function awaitTx({
  txnId,
  host,
  apiKey,
}: {
  txnId: string;
  host: string;
  apiKey: string;
}): Promise<any> {
  try {
    const resp = await fetch(`${host}/transaction/status/${txnId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    const raw = await resp.json();
    // logInfo(
    //   `Got status: ${raw.result.status}, queueId: ${raw.result.queueId}. Retrying...`,
    // );
    if (raw.result.status === "mined" || raw.result.status === "errored") {
      return raw.result;
    }
    // logInfo("Sleeping for 10 second...");
    await sleep(10);
    return awaitTx({ txnId, host, apiKey });
  } catch (error) {
    console.error("awaitTx error", error);
  }
}

async function processTransactions(
  txIds: string[],
  config: BenchmarkConfiguration,
) {
  logger.info(
    "Checking for status until all transactions are mined/errored. Can take upto 30 seconds or more...",
  );
  // await sleep(30);
  const statuses = await Promise.all(
    txIds.map((txnId) => {
      return awaitTx({
        apiKey: config.apiKey,
        host: config.host,
        txnId,
      });
    }),
  );

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

  type txn = {
    timeTaken?: number;
    txnHash?: string;
    status: string;
  };
  const erroredTransaction: txn[] = [];
  const submittedTransaction: txn[] = [];
  const processedTransaction: txn[] = [];
  const minedTransaction: txn[] = [];
  // logInfo("statuses", statuses);
  statuses.map((status) => {
    const parsedStatus = parseStatus(status);
    switch (parsedStatus.status) {
      case "errored": {
        erroredTransaction.push({
          status: parsedStatus.status,
        });
        break;
      }
      default: {
        if (
          parsedStatus.txProcessedTimestamp &&
          parsedStatus.createdTimestamp
        ) {
          // throw new Error(
          //   `Invalid response from server for status transaction: ${JSON.stringify(
          //     parsedStatus,
          //   )}`,
          // );
          processedTransaction.push({
            status: parsedStatus.status!,
            timeTaken:
              new Date(parsedStatus.txProcessedTimestamp).getTime() -
              new Date(parsedStatus.createdTimestamp).getTime(),
            txnHash: parsedStatus.txHash,
          });
        }

        if (
          parsedStatus.txSubmittedTimestamp &&
          parsedStatus.createdTimestamp
        ) {
          // throw new Error(
          //   `Invalid response from server for submitted transaction: ${JSON.stringify(
          //     parsedStatus,
          //   )}`,
          // );
          submittedTransaction.push({
            status: parsedStatus.status!,
            timeTaken:
              new Date(parsedStatus.txSubmittedTimestamp).getTime() -
              new Date(parsedStatus.createdTimestamp).getTime(),
            txnHash: parsedStatus.txHash,
          });
        }

        if (parsedStatus.txMinedTimestamp && parsedStatus.createdTimestamp) {
          // throw new Error(
          //   `Invalid response from server for mined transaction: ${JSON.stringify(
          //     parsedStatus,
          //   )}`,
          minedTransaction.push({
            status: parsedStatus.status!,
            timeTaken:
              new Date(parsedStatus.txMinedTimestamp).getTime() -
              new Date(parsedStatus.createdTimestamp).getTime(),
            txnHash: parsedStatus.txHash,
          });
        }
        break;
      }
    }
  });

  console.table({
    error: erroredTransaction.length,
    processing: processedTransaction.length,
    submittedToMempool: submittedTransaction.length,
    minedTransaction: minedTransaction.length,
  });

  const sortedProcessedTransaction = processedTransaction.sort(
    (a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0),
  );

  const sortedSubmittedTransaction = submittedTransaction.sort(
    (a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0),
  );

  const sortedMinedTransaction = minedTransaction.sort(
    (a, b) => (a.timeTaken ?? 0) - (b.timeTaken ?? 0),
  );

  console.table({
    "Avg Processing Time":
      processedTransaction.reduce(
        (acc, curr) => acc + (curr.timeTaken ?? 0),
        0,
      ) /
        processedTransaction.length /
        1_000 +
      " sec",
    "Median Processing Time":
      (sortedProcessedTransaction[
        Math.floor(sortedProcessedTransaction.length / 2)
      ].timeTaken ?? 0) /
        1_000 +
      " sec",
    "Min Processing Time":
      (sortedProcessedTransaction[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Processing Time":
      (sortedProcessedTransaction[sortedProcessedTransaction.length - 1]
        .timeTaken ?? 0) /
        1_000 +
      " sec",
  });

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

  console.table({
    "Avg Mined Time":
      minedTransaction.reduce((acc, curr) => acc + (curr.timeTaken ?? 0), 0) /
        minedTransaction.length /
        1_000 +
      " sec",
    "Median Mined Time":
      (sortedMinedTransaction[Math.floor(minedTransaction.length / 2)]
        .timeTaken ?? 0) /
        1_000 +
      " sec",
    "Min Mined Time":
      (sortedMinedTransaction[0].timeTaken ?? 0) / 1_000 + " sec",
    "Max Mined Time":
      (sortedMinedTransaction[sortedMinedTransaction.length - 1].timeTaken ??
        0) /
        1_000 +
      " sec",
  });

  return {
    erroredTransaction,
    submittedTransaction,
    processedTransaction,
    minedTransaction,
  };
}

async function main() {
  const config = await getBenchmarkConfiguration();

  logger.info(
    `Sending ${config.requests} requests to ${config.host}${config.path} with a concurrency of ${config.concurrency}.`,
  );

  const txIds = await sendTransactions(config);

  await processTransactions(txIds, config);
}

main();
