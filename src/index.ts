// import './fastify.d.ts'
import { getEnv } from './loadEnv';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { openapi } from './openapi';
import { errorHandler } from './errorHandler';
import fastifyCors from '@fastify/cors';
import { apiRoutes } from './api';
import { GenericApiReply, GenericApiRequest } from './types/fastify';
import cookie, { FastifyCookieOptions } from '@fastify/cookie';
import { apiKeyValidator } from "./middleware/apiKeyValidator";

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

  await server.register(openapi);

  await server.register(apiRoutes);
  
  // await server.addHook('onRequest', async (req, res) => {
  //   await apiKeyValidator(req, res);
  // });

  await server.ready();
  await server.listen({
    host: getEnv('HOST'),
    port: Number(getEnv('PORT')),
  }, ()=>{
    console.log(`Server listening on ${getEnv('HOST')}:${getEnv('PORT')}`)
  });
};

main();
