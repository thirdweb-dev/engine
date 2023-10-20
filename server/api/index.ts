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

// Contract Royalties
import { getDefaultRoyaltyInfo } from "./contract/royalties/read/getDefaultRoyaltyInfo";
import { getTokenRoyaltyInfo } from "./contract/royalties/read/getTokenRoyaltyInfo";
import { setDefaultRoyaltyInfo } from "./contract/royalties/write/setDefaultRoyaltyInfo";
import { setTokenRoyaltyInfo } from "./contract/royalties/write/setTokenRoyaltyInfo";

// Contract Metadata
import { getABI } from "./contract/metadata/abi";
import { extractEvents } from "./contract/metadata/events";
import { extractFunctions } from "./contract/metadata/functions";

// Wallet
import { createWallet } from "./backend-wallet/create";
import { getAll } from "./backend-wallet/getAll";
import { getBalance } from "./backend-wallet/getBalance";
import { importWallet } from "./backend-wallet/import";
import { sendTransaction } from "./backend-wallet/send";
import { transfer } from "./backend-wallet/transfer";

// Configuration
import { getChainsConfiguration } from "./configuration/chains/get";
import { updateChainsConfiguration } from "./configuration/chains/update";
import { getTransactionConfiguration } from "./configuration/transactions/get";
import { updateTransactionConfiguration } from "./configuration/transactions/update";
import { getWalletsConfiguration } from "./configuration/wallets/get";
import { updateWalletsConfiguration } from "./configuration/wallets/update";
import { getWebhooksConfiguration } from "./configuration/webhooks/get";
import { updateWebhooksConfiguration } from "./configuration/webhooks/update";

// Accounts
import { accountRoutes } from "./contract/extensions/account";
import { accountFactoryRoutes } from "./contract/extensions/accountFactory";

export const apiRoutes = async (fastify: FastifyInstance) => {
  // Wallet
  await fastify.register(createWallet);
  await fastify.register(importWallet);
  await fastify.register(getBalance);
  await fastify.register(getAll);
  await fastify.register(transfer);
  await fastify.register(sendTransaction);

  // Configuration
  await fastify.register(getWalletsConfiguration);
  await fastify.register(updateWalletsConfiguration);
  await fastify.register(getChainsConfiguration);
  await fastify.register(updateChainsConfiguration);
  await fastify.register(getTransactionConfiguration);
  await fastify.register(updateTransactionConfiguration);
  await fastify.register(getWebhooksConfiguration);
  await fastify.register(updateWebhooksConfiguration);

  // Chains
  await fastify.register(getChainData);
  await fastify.register(getAllChainData);

  // Generic
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

  // Contract Royalties
  await fastify.register(getDefaultRoyaltyInfo);
  await fastify.register(getTokenRoyaltyInfo);
  await fastify.register(setDefaultRoyaltyInfo);
  await fastify.register(setTokenRoyaltyInfo);

  // Deploy
  await fastify.register(prebuiltsRoutes);

  // Transactions
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
