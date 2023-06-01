import { FastifyInstance } from "fastify";
import { readContract } from "./contract/read/read";
import { writeToContract } from "./contract/write/write";

import { checkTxStatus } from "./transaction/status";

// Extensions
import { erc20Routes } from "./contract/extensions/erc20/index";
import { deployPrebuilt } from "./deployer/prebuilt";
import { deployPublished } from "./deployer/published";
import { erc721Routes } from "./contract/extensions/erc721";
import { erc1155Routes } from "./contract/extensions/erc1155";
import { contractTypes } from "./deployer/contractTypes";

export const apiRoutes = async (fastify: FastifyInstance) => {
  // deployer
  await fastify.register(deployPrebuilt);
  await fastify.register(deployPublished);
  await fastify.register(contractTypes);

  // generic
  await fastify.register(readContract);
  await fastify.register(writeToContract);

  // transaction status
  await fastify.register(checkTxStatus);

  // Extensions
  await fastify.register(erc20Routes);
  await fastify.register(erc721Routes);
  await fastify.register(erc1155Routes);
};
