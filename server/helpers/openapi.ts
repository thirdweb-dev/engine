import swagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";
import { env } from "../../src/utils/env";

// fastify-swagger v8 requires the swagger-ui & openapi specs
// to be separate unlike old implementation

export const openapi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    mode: "dynamic",
    openapi: {
      info: {
        title: "thirdweb web3-API",
        description: "thirdweb web3-API",
        version: "1.0.0",
        license: {
          name: "Apache 2.0",
          url: "http://www.apache.org/licenses/LICENSE-2.0.html",
        },
      },
      servers: [
        {
          url: env.OPENAPI_BASE_ORIGIN,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "For Secure Server-Server Calls",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
  });

  await server.register(fastifySwaggerUI, {
    routePrefix: "/",
    initOAuth: {},
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      displayOperationId: false,
    },

    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
};
