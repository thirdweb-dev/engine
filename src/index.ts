import { getEnv } from './loadEnv';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import * as fs from 'fs';
import { openapi } from './openapi';
import { errorHandler } from './errorHandler';
import fastifyCors from '@fastify/cors';
import { apiRoutes } from './api';
import cookie, { FastifyCookieOptions } from '@fastify/cookie';
import { logger } from './utilities/logger';

const logSettings: any = {
  // local: {
  //   transport: {
  //     target: 'pino-pretty',
  //     options: {
  //       translateTime: 'HH:MM:ss Z',
  //       ignore: 'pid,hostname',
  //     },
  //   },
  // },
  // production: true,
  // development: true,
};
const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logSettings[getEnv('NODE_ENV')] ?? false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await server.register(errorHandler);

  await server.register(fastifyCors);

  server.register(cookie, {
    parseOptions: {}, // options for parsing cookies
  } as FastifyCookieOptions);

  await server.register(fastifyExpress);
  openapi(server);
  await server.register(apiRoutes);

  await server.ready();
  
  // Command to Generate Swagger File
  // Needs to be called post Fastify Server is Ready
  server.swagger();
  
  // To Generate Swagger YAML File
  if (getEnv('NODE_ENV') === "local") {
    const yaml = server.swagger({ yaml: true });
    fs.writeFileSync('./swagger.yml', yaml);
  }

  await server.listen({
    host: getEnv('HOST'),
    port: Number(getEnv('PORT')),
  }, ()=>{
    logger.info(`Server listening on ${getEnv('HOST')}:${getEnv('PORT')}`)
  });
};

main();
