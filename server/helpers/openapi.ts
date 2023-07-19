import swagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { getEnv } from "../../core/loadEnv";
import { FastifyInstance } from "fastify";

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
          url: getEnv("OPENAPI_BASE_ORIGIN", "http://localhost:3005"),
        },
      ],
      components: {
        securitySchemes: {
          sharedSecret: {
            type: "apiKey",
            name: "x-secret-key",
            in: "header",
            description: "For Secure Server-Server Calls",
          },
        },
      },
      security: [
        {
          sharedSecret: [],
        },
      ],
    },
  });

  // Not all options are required below
  // We can change/remove them too.
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
