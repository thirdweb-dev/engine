import { FastifyInstance } from "fastify";
import { getContractExtensions } from "./contract/metadata/extensions";
import { readContract } from "./contract/read/read";
import { writeToContract } from "./contract/write/write";

// Transactions
import { cancelTransaction } from "./transaction/cancel";
import { getAllTx } from "./transaction/getAll";
import { getAllDeployedContracts } from "./transaction/getAllDeployedContracts";
import { retryTransaction } from "./transaction/retry";
import { checkTxStatus } from "./transaction/status";

// Extensions
import { erc1155Routes } from "./contract/extensions/erc1155";
import { erc20Routes } from "./contract/extensions/erc20/index";
import { erc721Routes } from "./contract/extensions/erc721";
import { marketplaceV3Routes } from "./contract/extensions/marketplaceV3/index";
import { prebuiltsRoutes } from "./deploy";

// Chain
import { getChainData } from "./chain/get";
import { getAllChainData } from "./chain/getAll";

// Contract Events
import { getAllEvents } from "./contract/events/getAllEvents";
import { getEvents } from "./contract/events/getEvents";

// Contract Roles
import { getRoles } from "./contract/roles/read/get";
import { getAllRoles } from "./contract/roles/read/getAll";
import { grantRole } from "./contract/roles/write/grant";
import { revokeRole } from "./contract/roles/write/revoke";

// Contract Metadata
import { getABI } from "./contract/metadata/abi";
import { extractEvents } from "./contract/metadata/events";
import { extractFunctions } from "./contract/metadata/functions";

// Wallet
import { createWallet } from "./backend-wallet/create";
import { getAll } from "./backend-wallet/getAll";
import { getBalance } from "./backend-wallet/getBalance";
import { importWallet } from "./backend-wallet/import";
import { accountRoutes } from "./contract/extensions/account";
import { accountFactoryRoutes } from "./contract/extensions/accountFactory";

export const apiRoutes = async (fastify: FastifyInstance) => {
  // Wallet
  await fastify.register(createWallet);
  await fastify.register(importWallet);
  await fastify.register(getBalance);
  await fastify.register(getAll);

  // Chains
  await fastify.register(getChainData);
  await fastify.register(getAllChainData);

  // generic
  await fastify.register(readContract);
  await fastify.register(writeToContract);

  // Contract Events
  await fastify.register(getAllEvents);
  await fastify.register(getEvents);

  // Contract Metadata
  await fastify.register(getABI);
  await fastify.register(extractEvents);
  await fastify.register(getContractExtensions);
  await fastify.register(extractFunctions);

  // Contract Roles
  await fastify.register(getRoles);
  await fastify.register(getAllRoles);
  await fastify.register(grantRole);
  await fastify.register(revokeRole);

  // deploy
  await fastify.register(prebuiltsRoutes);

  // transaction status
  await fastify.register(checkTxStatus);
  await fastify.register(getAllTx);
  await fastify.register(getAllDeployedContracts);
  await fastify.register(retryTransaction);
  await fastify.register(cancelTransaction);

  // Extensions
  await fastify.register(accountFactoryRoutes);
  await fastify.register(accountRoutes);
  await fastify.register(erc20Routes);
  await fastify.register(erc721Routes);
  await fastify.register(erc1155Routes);
  await fastify.register(marketplaceV3Routes);
};
