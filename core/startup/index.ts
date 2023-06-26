import { FastifyInstance } from "fastify";
import { getEnv } from "../loadEnv";

export const envVariablesCheck = async (
  server: FastifyInstance,
  variables: string[],
) => {
  server.log.info(`Checking for required env variables`);

  for (let str of variables) {
    server.log.info(`Checking for ${str} in env`);
    if (!getEnv(str, undefined)) {
      server.log.error(`${str} not found in env`);
      process.exit(1);
    }
  }
};
