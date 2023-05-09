// import './fastify.d.ts'
import { getEnv } from './loadEnv';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { openapi } from './openapi';
import { errorHandler } from './errorHandler';
import { ThirdwebAuth } from '@thirdweb-dev/auth/express';
import { PrivateKeyWallet } from '@thirdweb-dev/auth/evm';
import fastifyCors from '@fastify/cors';
// import { checkApiAccess } from './auth/checkApiAccess';
import { apiRoutes } from './api';
import { GenericApiReply, GenericApiRequest } from './types/fastify';
import cookie, { FastifyCookieOptions } from '@fastify/cookie';
import { apiKeyValidator } from "./middleware/apiKeyValidator";

const logSettings: any = {
  // development: {
  //   transport: {
  //     target: 'pino-pretty',
  //     options: {
  //       translateTime: 'HH:MM:ss Z',
  //       ignore: 'pid,hostname',
  //     },
  //   },
  // },
  // production: true,
  // test: false,
};
const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logSettings[getEnv('NODE_ENV')] ?? false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await server.register(errorHandler);

  await server.register(fastifyCors, {
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, false);
      }

      // Check if the origin is localhost
      // const isLocalhost =
      //   getEnv('NODE_ENV') !== 'production' &&
      //   (origin.startsWith('http://localhost') ||
      //     origin.startsWith('http://127.0.0.1'));

      // // Check if the origin is thirdweb.com
      // const isThirdWeb = origin === 'https://thirdweb.com';

      // // Check if the origin is a subdomain of thirdweb-preview.com
      // const isThirdWebPreview = /^https?:\/\/.*\.thirdweb-preview\.com$/.test(
      //   origin
      // );

      // // Allow requests if the origin matches any of the above conditions
      // if (isLocalhost || isThirdWeb || isThirdWebPreview) {
      //   callback(null, true);
      // } else {
      //   callback(null, false);
      // }
      callback(null, true);
    },
    credentials: true,
  });

  server.register(cookie, {
    parseOptions: {}, // options for parsing cookies
  } as FastifyCookieOptions);

  await server.register(fastifyExpress);

  const { authRouter, authMiddleware, getUser } = ThirdwebAuth({
    domain: process.env.THIRDWEB_AUTH_DOMAIN || 'localhost:3005',
    wallet: new PrivateKeyWallet(
      process.env.THIRDWEB_AUTH_PRIVATE_KEY ||
        'dc91391b486c6ccdf0b705af8b3776360145e2c1ddbff9f524648cae12c1ae56'
    ),
  });

  await server.register(openapi);

  await server.register(apiRoutes);
  
  await server.addHook('onRequest', async (req, res) => {
    await apiKeyValidator(req, res);
  });

  await server.ready();
  await server.listen({
    host: getEnv('HOST'),
    port: Number(getEnv('PORT')),
  }, ()=>{
    console.log(`Server listening on ${getEnv('HOST')}:${getEnv('PORT')}`)
  });
};

main();
