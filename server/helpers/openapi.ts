import swagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";

// fastify-swagger v8 requires the swagger-ui & openapi specs
// to be separate unlike old implementation

export const openapi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    mode: "dynamic",
    openapi: {
      info: {
        title: "thirdweb Engine",
        description: "The most powerful backend engine for web3 apps.",
        version: "0.0.2",
        license: {
          name: "Apache 2.0",
          url: "http://www.apache.org/licenses/LICENSE-2.0.html",
        },
      },
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
      docExpansion: "none",
      // filter: true, // This options enables search bar to allow serach by tags
      deepLinking: true,
      displayOperationId: false,
      layout: "BaseLayout",
    },

    staticCSP: true,
    transformStaticCSP: (header) => header,
  });
};
