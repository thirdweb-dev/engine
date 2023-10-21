import swagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "../../src/utils/env";

// fastify-swagger v8 requires the swagger-ui & openapi specs
// to be separate unlike old implementation

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "../../static/swagger-css", "dark.css");
const content = fs.readFileSync(filePath, "utf8");

export const openapi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    mode: "dynamic",
    openapi: {
      info: {
        title: "thirdweb Engine",
        description: "The most powerful backend engine for web3 apps.",
        version: "0.0.3",
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
    theme: {
      css: [
        {
          filename: "theme.css",
          content,
        },
      ],
    },
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
