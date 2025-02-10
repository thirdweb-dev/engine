import type { FastifyInstance } from "fastify";
import { getAllAccounts } from "./read/get-all-accounts.js";
import { getAssociatedAccounts } from "./read/get-associated-accounts.js";
import { isAccountDeployed } from "./read/is-account-deployed.js";
import { predictAccountAddress } from "./read/predict-account-address.js";
import { createAccount } from "./write/create-account.js";

export const accountFactoryRoutes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(getAllAccounts);
  await fastify.register(getAssociatedAccounts);
  await fastify.register(isAccountDeployed);
  await fastify.register(predictAccountAddress);

  // POST
  await fastify.register(createAccount);
};
