import fastifySwagger from '@fastify/swagger';
import { getEnv } from './loadEnv';
import { FastifyInstance } from 'fastify';

export const openapi = async (server: FastifyInstance) => {
  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'thirdweb web3-API',
        description: 'thirdweb web3-API',
        version: '1.0.0',
      },
      servers: [
        {
          url: getEnv('OPENAPI_BASE_ORIGIN'),
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
          },
          walletId: {
            type: 'apiKey',
            name: 'x-wallet-Id',
            in: 'header',
          },
        },
      },
    },
  });
};
