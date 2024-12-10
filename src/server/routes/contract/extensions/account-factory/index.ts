import { FastifyInstance } from "fastify";
import { getAllAccounts } from "./read/get-all-accounts";
import { getAssociatedAccounts } from "./read/get-associated-accounts";
import { isAccountDeployed } from "./read/is-account-deployed";
import { predictAccountAddress } from "./read/predict-account-address";
import { createAccount } from "./write/create-account";

export const accountFactoryRoutes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(getAllAccounts);
  await fastify.register(getAssociatedAccounts);
  await fastify.register(isAccountDeployed);
  await fastify.register(predictAccountAddress);

  // POST
  await fastify.register(createAccount);
};
