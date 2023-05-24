import { FastifyInstance } from "fastify";
import { erc721Get } from "./read/get";
import { erc721GetAll } from "./read/getAll";
import { erc721BalanceOf } from "./read/balanceOf";
import { erc721IsApproved } from "./read/isApproved";
import { erc721TotalCount } from "./read/totalCount";
import { erc721TotalClaimedSupply } from "./read/totalClaimedSupply";
import { erc721GetOwned } from "./read/getOwned";
import { erc721TotalUnclaimedSupply } from "./read/totalUnclaimedSupply";

export const erc721Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc721Get);
  await fastify.register(erc721GetAll);
  await fastify.register(erc721GetOwned);
  await fastify.register(erc721BalanceOf);
  await fastify.register(erc721IsApproved);
  await fastify.register(erc721TotalCount);
  await fastify.register(erc721TotalClaimedSupply);
  await fastify.register(erc721TotalUnclaimedSupply);

  // POST
};
