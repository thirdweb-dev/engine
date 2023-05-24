import { FastifyInstance } from "fastify";
import { erc1155Get } from "./read/get";
import { erc1155GetAll } from "./read/getAll";
import { erc1155BalanceOf } from "./read/balanceOf";
import { erc1155IsApproved } from "./read/isApproved";
import { erc1155GetOwned } from "./read/getOwned";
import { erc1155TotalSupply } from "./read/totalSupply";
import { erc1155TotalCount } from "./read/totalCount";

export const erc1155Routes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(erc1155Get);
  await fastify.register(erc1155GetAll);
  await fastify.register(erc1155GetOwned);
  await fastify.register(erc1155BalanceOf);
  await fastify.register(erc1155IsApproved);
  await fastify.register(erc1155TotalCount);
  await fastify.register(erc1155TotalSupply);

  // POST
};
