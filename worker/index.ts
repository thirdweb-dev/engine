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
  setTimeout(async () => {
    await startNotificationListener(server);
  }, 10000);
};

main();
