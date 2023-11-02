import { FastifyInstance } from "fastify";
import fs from "fs";

export const writeOpenApiToFile = (server: FastifyInstance) => {
  try {
    fs.writeFileSync(
      "./dist/openapi.json",
      JSON.stringify(server.swagger(), undefined, 2),
    );
  } catch {
    // no-op
  }
};
