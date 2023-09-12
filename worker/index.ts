import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastify, { FastifyInstance } from "fastify";
import * as cron from "node-cron";
import { env, errorHandler, getLogSettings } from "../core";
import { checkForMinedTransactionsOnBlockchain } from "./controller/blockchainReader";
import { startNotificationListener } from "./controller/listener";
import { retryTransactions } from "./controller/retryTransaction";
import { setupWalletsForWorker } from "./controller/wallet";

const MINED_TX_CRON_SCHEDULE = env.MINED_TX_CRON_SCHEDULE;
const RETRY_TX_CRON_SCHEDULE = env.RETRY_TX_CRON_SCHEDULE;

const main = async () => {
  const logOptions = getLogSettings("Worker-Server");
  const server: FastifyInstance = fastify({
    logger: logOptions ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await errorHandler(server);

  try {
    await setupWalletsForWorker(server);
    // Start Listening to the Table for new insertion
    await retryWithTimeout(
      () => startNotificationListener(server),
      3,
      5000,
      server,
    );
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
  // setup a cron job to updated transaction confirmed status
  cron.schedule(MINED_TX_CRON_SCHEDULE, async () => {
    await checkForMinedTransactionsOnBlockchain(server);
  });

  cron.schedule(RETRY_TX_CRON_SCHEDULE, async () => {
    await retryTransactions(server);
  });
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
