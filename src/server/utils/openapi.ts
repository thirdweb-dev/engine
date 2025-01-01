import type { FastifyInstance } from "fastify";
import fs from "node:fs";

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
