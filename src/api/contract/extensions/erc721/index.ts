import { FastifyInstance } from "fastify";
import { erc721GetMetadata } from "./read/get";

export const erc721Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc721GetMetadata);

  // POST
};
