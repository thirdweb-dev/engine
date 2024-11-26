import fs from "fs";
import type { FastifyInstance } from "fastify";

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
