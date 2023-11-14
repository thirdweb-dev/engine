import swagger from "@fastify/swagger";
import { FastifyInstance } from "fastify";

export const withOpenApi = async (server: FastifyInstance) => {
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

  // Exports the /json endpoint without the Swagger UI.
  await server.get("/json", {}, async (req, res) => {
    res.send(server.swagger());
  });
};
