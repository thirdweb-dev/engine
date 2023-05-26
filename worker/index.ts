import { getEnv } from './helpers/loadEnv';
import fastify, { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { errorHandler } from './helpers';
import { startNotificationListener } from './controller/listener';

const logSettings: any = {
  local: {
    redact: ["headers.authorization",],
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,reqId',
        singleLine: true,
        minimumLevel: 'debug',
      },
    },
  },
  production: true,
  development: {
    
  },
};

const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logSettings[getEnv('NODE_ENV')] ?? true,
    disableRequestLogging: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await errorHandler(server);

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
