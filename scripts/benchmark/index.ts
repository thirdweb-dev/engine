import autocannon from "autocannon";
import * as dotenv from "dotenv";
import { env } from "process";

dotenv.config({
  debug: true,
  override: false,
});

function logInfo(msg: string) {
  console.log(`[INFO] ${msg}`);
}
function logError(msg: string) {
  console.error(`[ERROR] ${msg}`);
}

function getBenchmarkOpts() {}

function sendTransaction() {}

function processTransaction() {}

function confirmTransaction() {}

function getBlockStats() {}

// async/await
async function runBenchmark() {
  // TODO: set defaults
  if (!env.BENCHMARK_HOST) {
    throw new Error("BENCHMARK_HOST is not set");
  }
  if (!env.BENCHMARK_URL_PATH) {
    throw new Error("BENCHMARK_URL_PATH is not set");
  }
  if (!env.THIRDWEB_SDK_SECRET_KEY) {
    throw new Error("THIRDWEB_SDK_SECRET_KEY is not set");
  }
  if (!env.BENCHMARK_POST_BODY) {
    throw new Error("BENCHMARK_POST_BODY is not set");
  }
  if (!env.BENCHMARK_CONCURRENCY) {
    throw new Error("BENCHMARK_CONCURRENCY is not set");
  }
  if (!env.BENCHMARK_REQUESTS) {
    throw new Error("BENCHMARK_REQUESTS is not set");
  }

  logInfo(
    `Benchmarking ${env.BENCHMARK_HOST}${env.BENCHMARK_URL_PATH} with ${env.BENCHMARK_CONCURRENCY} concurrency and ${env.BENCHMARK_REQUESTS} requests`,
  );
  const instance = await autocannon({
    url: `${env.BENCHMARK_HOST}`,
    connections: parseInt(env.BENCHMARK_CONCURRENCY),
    amount: parseInt(env.BENCHMARK_REQUESTS),
    requests: [
      {
        path: env.BENCHMARK_URL_PATH,
        headers: {
          authorization: `Bearer ${env.THIRDWEB_SDK_SECRET_KEY}`,
          "content-type": "application/json",
        },
        method: "POST",
        body: env.BENCHMARK_POST_BODY,
        // @ts-ignore: autocannon types are 3 minor versions behind.
        // This was one of the new field that was recently added
        onResponse: (
          status: number,
          body: string,
          context: Record<string, unknown>,
        ) => {
          console.log("typeof body", typeof body);
          if (status === 200) {
            const parsedResult: { result?: string } = JSON.parse(body);
            if (!parsedResult.result) {
              logError(
                `Response body does not contain a "result" field: ${body}`,
              );
              return;
            }
            logInfo(`Response body: ${JSON.stringify(parsedResult)}`);
            logInfo(`Response context: ${JSON.stringify(context)}`);
          }
        },
      },
    ],
  });
  const result = autocannon.printResult(instance);
  console.log(result);
}

runBenchmark().catch((e) => {
  console.error("Error while running benchmark:");
  console.error(e);
  process.exit(1);
});
