import swagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import { getEnv } from './loadEnv';
import { FastifyInstance } from 'fastify';

// fastify-swagger v8 requires the swagger-ui & openapi specs
// to be separate unlike old implementation

export const openapi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    mode:'dynamic',
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
        // To show schemas on the Docs if needed, uncomment
        // schemas:{
        //   'read': {
        //     'type': 'object'
        //   }
        // },
        securitySchemes: {
          sharedSecret: {
            type: 'apiKey',
            name: 'x-shared-secret',
            in: 'header',
            description: "For Secure Server-Server Calls"
          },
        },
      },
      security: [{
        sharedSecret: []
      }]
    },
  });

  // Not all options are required below
  // We can change/remove them too.
  await server.register(fastifySwaggerUI, {
    routePrefix: '/',
    initOAuth: { },
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayOperationId: false
    },
    uiHooks: {
      onRequest: function (request, reply, next) { next() },
      preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  })
};
