import fastify, { FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { errorHandler, getEnv } from "../core";
import { startNotificationListener } from "./controller/listener";
import { logSettings } from "../core";

const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logSettings[getEnv("NODE_ENV", "development")] ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await errorHandler(server);

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
