import type { FastifyInstance } from "fastify";
import { getAllAccounts } from "./read/getAllAccounts";
import { getAssociatedAccounts } from "./read/getAssociatedAccounts";
import { isAccountDeployed } from "./read/isAccountDeployed";
import { predictAccountAddress } from "./read/predictAccountAddress";
import { createAccount } from "./write/createAccount";

export const accountFactoryRoutes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(getAllAccounts);
  await fastify.register(getAssociatedAccounts);
  await fastify.register(isAccountDeployed);
  await fastify.register(predictAccountAddress);

  // POST
  await fastify.register(createAccount);
};
