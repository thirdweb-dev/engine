import dotenv from "dotenv";
import { fetchApi } from "./api";
import { logger } from "./logger";
import { awaitTx } from "./transactions";

dotenv.config({
  debug: true,
  override: true,
  path: ".env.benchmark",
});

export type BenchmarkConfiguration = {
  apiKey: string;
  host: string;
  path: string;
  body: string;
  requests: number;
  concurrency: number;
  walletAddress: string;
  accountAddress?: string;
};

const requireEnv = (varName: string) => {
  const val = process.env[varName];
  if (!val) {
    throw new Error(`Please set the ${varName} environment variable`);
  }

  return val;
};

export const getBenchmarkConfiguration =
  async (): Promise<BenchmarkConfiguration> => {
    const benchmarkConfig = {
      apiKey: requireEnv("THIRDWEB_API_SECRET_KEY"),
      host: process.env.BENCHMARK_HOST ?? `http://127.0.0.1:3005`,
      requests: parseInt(requireEnv("BENCHMARK_REQUESTS") ?? 100),
      concurrency: parseInt(requireEnv("BENCHMARK_CONCURRENCY") ?? 10),
      walletAddress: requireEnv("BENCHMARK_BACKEND_WALLET_ADDRESS"),
      accountAddress: process.env.BENCHMARK_ACCOUNT_ADDRESS,
    };

    if (process.env.BENCHMARK_PATH || process.env.BENCHMARK_BODY) {
      requireEnv("BENCHMARK_PATH");
      requireEnv("BENCHMARK_BODY");

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
      } = await fetchApi({
        host: benchmarkConfig.host,
        apiKey: benchmarkConfig.apiKey,
        path: `/deploy/${chain}/prebuilts/token`,
        method: `POST`,
        walletAddress: benchmarkConfig.walletAddress,
        body: JSON.stringify({
          contractMetadata: {
            name: "Benchmark Token",
            description:
              "This token contract was deployed for benchmark testing.",
            platform_fee_basis_points: 0,
            platform_fee_recipient: adminAddress,
            primary_sale_recipient: adminAddress,
          },
        }),
      });

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
  };
