import { FastifyInstance } from "fastify";
import { readContract } from "./contract/read/read";
import { writeToContract } from "./contract/write/write";

import { checkTxStatus } from "./transaction/status";
import { getAllTx } from "./transaction/getAll";

// Extensions
import { erc20Routes } from "./contract/extensions/erc20/index";
import { erc721Routes } from "./contract/extensions/erc721";
import { erc1155Routes } from "./contract/extensions/erc1155";
import { prebuiltsRoutes } from "./deployer";
import { marketplaceV3Routes } from "./contract/extensions/marketplaceV3/index";

// Chain
import { getChainData } from "./chain/get";
import { getAllChainData } from "./chain/getAll";

export const apiRoutes = async (fastify: FastifyInstance) => {
  // Chains
  await fastify.register(getChainData);
  await fastify.register(getAllChainData);

  // generic
  await fastify.register(readContract);
  await fastify.register(writeToContract);

  // deployer
  await fastify.register(prebuiltsRoutes);

  // transaction status
  await fastify.register(checkTxStatus);
  await fastify.register(getAllTx);

  // Extensions
  await fastify.register(erc20Routes);
  await fastify.register(erc721Routes);
  await fastify.register(erc1155Routes);
  await fastify.register(marketplaceV3Routes);
};
