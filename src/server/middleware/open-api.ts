import swagger from "@fastify/swagger";
import type { FastifyInstance } from "fastify";

export const withOpenApi = async (server: FastifyInstance) => {
  await server.register(swagger, {
    openapi: {
      info: {
        title: "thirdweb Engine",
        description: "The open-source server for scalable web3 apps.",
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
    refResolver: {
      buildLocalReference(json, baseUri, fragment, i) {
        return json.$id || `def-${i}`;
      },
    },
  });

  // Exports the /json endpoint without the Swagger UI.
  server.get("/json", {}, async (_, res) => {
    res.send(server.swagger());
  });
};
