import { FastifyInstance } from "fastify";
import { erc721Get } from "./read/get";
import { erc721GetAll } from "./read/getAll";
import { erc721BalanceOf } from "./read/balanceOf";
import { erc721isApproved } from "./read/isApproved";

export const erc721Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc721Get);
  await fastify.register(erc721GetAll);
  await fastify.register(erc721BalanceOf);
  await fastify.register(erc721isApproved);

  // POST
};
