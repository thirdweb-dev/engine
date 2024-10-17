import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";

export const OPENAPI_ROUTES = ["/json", "/openapi.json"];

export const withOpenApi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    openapi: {
      info: {
        title: "thirdweb Engine",
        description:
          "Engine is an open-source, backend server that reads, writes, and deploys contracts at production scale.",
        version: "1.0.0",
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
            description: "To authenticate server-side requests",
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

  for (const path of OPENAPI_ROUTES) {
    server.get(path, {}, async (_, res) => {
      res.send(server.swagger());
    });
  }
};
