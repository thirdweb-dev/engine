import { errorHandler } from "../core";
import fastify, { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { startNotificationListener } from "./controller/listener";
import {
  getLogSettings,
  envVariablesCheck,
  walletEnvVariablesCheck,
} from "../core";
import { setupWalletsForWorker } from "./controller/wallet";
import {
  WEB3_API_REQUIRED_ENV_VARS,
  WEB3_API_WALLETS_ENV_VARS,
} from "../core/constants";

const main = async () => {
  const logOptions = getLogSettings("Worker-Server");
  const server: FastifyInstance = fastify({
    logger: logOptions ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await errorHandler(server);

  await envVariablesCheck(server, WEB3_API_REQUIRED_ENV_VARS);
  await walletEnvVariablesCheck(server, WEB3_API_WALLETS_ENV_VARS);

  await setupWalletsForWorker(server);
  // Start Listening to the Table for new insertion
  await retryWithTimeout(
    () => startNotificationListener(server),
    3,
    5000,
    server,
  );
};

// Retry logic with timeout
const retryWithTimeout = async (
  fn: () => Promise<any>,
  retries: number,
  timeout: number,
  server: FastifyInstance,
): Promise<any> => {
  try {
    server.log.info("Trying to connect to the database");
    return await fn();
  } catch (error) {
    server.log.info(
      `Retries left: ${retries}, every ${timeout / 1000} seconds`,
    );
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      return await retryWithTimeout(fn, retries - 1, timeout, server);
    } else {
      throw new Error(
        "Maximum retries exceeded. Unable to recover from the error.",
      );
    }
  }
};

main();
