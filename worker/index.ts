import fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import {
    errorHandler,
} from '../core';
import { startNotificationListener } from "./controller/listener";
import { getLogSettings } from "../core";

const main = async () => {
  const logOptions = getLogSettings("Worker-Server");
  const server: FastifyInstance = fastify({
    logger: logOptions ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await errorHandler(server);

  // The below code is commented out because worker doesn't require any routes
  // but for health-check, if needed in future, uncomment the below code and add the routes
  
  // await server.register(fastifyExpress);
  // await server.ready();
  // server.listen({
  //   host: getEnv('WORKER_HOST'),
  //   port: Number(getEnv('WORKER_PORT')),
  // }, (err) => {
  //   if (err) {
  //     server.log.error(err);
  //     process.exit(1);
  //   }
  // });

  // Start Listening to the Table for new insertion
  await retryWithTimeout(() => startNotificationListener(server), 3, 5000, server);
};

// Retry logic with timeout
const retryWithTimeout = async (fn: () => Promise<any>, retries: number, timeout: number, server: FastifyInstance): Promise<any> => {
  try {
    server.log.info('Trying to connect to the database');
    return await fn();
  } catch (error) {
    server.log.info(`Retries left: ${retries}, every ${timeout / 1000} seconds`);
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      return await retryWithTimeout(fn, retries - 1, timeout, server);
    } else {
      throw new Error('Maximum retries exceeded. Unable to recover from the error.');
    }
  }
};

main();
