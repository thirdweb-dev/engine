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

// Chains
import { getChainData } from "./chain/get";
import { getAllChainData } from "./chain/getAll";

// Contract events
import { getAllEvents } from "./contract/events/getAllEvents";
import { getEvents } from "./contract/events/getEvents";

// Contract roles
import { getRoles } from "./contract/roles/read/get";
import { getAllRoles } from "./contract/roles/read/getAll";
import { grantRole } from "./contract/roles/write/grant";
import { revokeRole } from "./contract/roles/write/revoke";

// Contract royalties
import { getDefaultRoyaltyInfo } from "./contract/royalties/read/getDefaultRoyaltyInfo";
import { getTokenRoyaltyInfo } from "./contract/royalties/read/getTokenRoyaltyInfo";
import { setDefaultRoyaltyInfo } from "./contract/royalties/write/setDefaultRoyaltyInfo";
import { setTokenRoyaltyInfo } from "./contract/royalties/write/setTokenRoyaltyInfo";

// Contract metadata
import { getABI } from "./contract/metadata/abi";
import { extractEvents } from "./contract/metadata/events";
import { extractFunctions } from "./contract/metadata/functions";

// Wallet
import { createBackendWallet } from "./backend-wallet/create";
import { getAll } from "./backend-wallet/getAll";
import { getBalance } from "./backend-wallet/getBalance";
import { getBackendWalletNonce } from "./backend-wallet/getNonce";
import { importBackendWallet } from "./backend-wallet/import";
import { sendTransaction } from "./backend-wallet/sendTransaction";
import { transfer } from "./backend-wallet/transfer";
import { updateBackendWallet } from "./backend-wallet/update";

// Configuration
import { getBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/get";
import { updateBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/update";
import { getCacheConfiguration } from "./configuration/cache/get";
import { updateCacheConfiguration } from "./configuration/cache/update";
import { getChainsConfiguration } from "./configuration/chains/get";
import { updateChainsConfiguration } from "./configuration/chains/update";
import { addUrlToCorsConfiguration } from "./configuration/cors/add";
import { getCorsConfiguration } from "./configuration/cors/get";
import { removeUrlToCorsConfiguration } from "./configuration/cors/remove";
import { getTransactionConfiguration } from "./configuration/transactions/get";
import { updateTransactionConfiguration } from "./configuration/transactions/update";
import { getWalletsConfiguration } from "./configuration/wallets/get";
import { updateWalletsConfiguration } from "./configuration/wallets/update";

// Webhooks
import { createWebhook } from "./webhooks/create";
import { getWebhooksEventTypes } from "./webhooks/events";
import { getAllWebhooksData } from "./webhooks/getAll";
import { revokeWebhook } from "./webhooks/revoke";

// Access tokens
import { createAccessToken } from "./auth/access-tokens/create";
import { getAllAccessTokens } from "./auth/access-tokens/getAll";
import { revokeAccessToken } from "./auth/access-tokens/revoke";
import { updateAccessToken } from "./auth/access-tokens/update";

// Admins
import { getAllPermissions } from "./auth/permissions/getAll";
import { grantPermissions } from "./auth/permissions/grant";
import { revokePermissions } from "./auth/permissions/revoke";
import { signMessage } from "./backend-wallet/signMessage";
import { signTransaction } from "./backend-wallet/signTransaction";
import { getAuthConfiguration } from "./configuration/auth/get";
import { updateAuthConfiguration } from "./configuration/auth/update";

// Smart accounts
import { accountRoutes } from "./contract/extensions/account";
import { accountFactoryRoutes } from "./contract/extensions/accountFactory";

// Relayers
import { relayTransaction } from "./relayer";
import { createRelayer } from "./relayer/create";
import { getAllRelayers } from "./relayer/getAll";
import { revokeRelayer } from "./relayer/revoke";

// System
import { getAllTransactions } from "./backend-wallet/getTransactions";
import { resetBackendWalletNonces } from "./backend-wallet/resetNonces";
import { sendTransactionBatch } from "./backend-wallet/sendTransactionBatch";
import { withdraw } from "./backend-wallet/withdraw";
import { home } from "./home";
import { updateRelayer } from "./relayer/update";
import { healthCheck } from "./system/health";
import { queueStatus } from "./system/queue";
import { checkGroupStatus } from "./transaction/group";
import { sendSignedTransaction } from "./transaction/sendSignedTx";
import { sendSignedUserOp } from "./transaction/sendSignedUserOp";

export const withRoutes = async (fastify: FastifyInstance) => {
  // Backend Wallets
  await fastify.register(createBackendWallet);
  await fastify.register(importBackendWallet);
  await fastify.register(updateBackendWallet);
  await fastify.register(getBalance);
  await fastify.register(getAll);
  await fastify.register(transfer);
  await fastify.register(withdraw);
  await fastify.register(sendTransaction);
  await fastify.register(sendTransactionBatch);
  await fastify.register(signTransaction);
  await fastify.register(signMessage);
  await fastify.register(getAllTransactions);
  await fastify.register(resetBackendWalletNonces);
  await fastify.register(getBackendWalletNonce);

  // Configuration
  await fastify.register(getWalletsConfiguration);
  await fastify.register(updateWalletsConfiguration);
  await fastify.register(getChainsConfiguration);
  await fastify.register(updateChainsConfiguration);
  await fastify.register(getTransactionConfiguration);
  await fastify.register(updateTransactionConfiguration);
  await fastify.register(getAuthConfiguration);
  await fastify.register(updateAuthConfiguration);
  await fastify.register(getBackendWalletBalanceConfiguration);
  await fastify.register(updateBackendWalletBalanceConfiguration);
  await fastify.register(getCorsConfiguration);
  await fastify.register(addUrlToCorsConfiguration);
  await fastify.register(removeUrlToCorsConfiguration);
  await fastify.register(getCacheConfiguration);
  await fastify.register(updateCacheConfiguration);

  // Webhooks
  await fastify.register(getAllWebhooksData);
  await fastify.register(createWebhook);
  await fastify.register(revokeWebhook);
  await fastify.register(getWebhooksEventTypes);

  // Permissions
  await fastify.register(getAllPermissions);
  await fastify.register(grantPermissions);
  await fastify.register(revokePermissions);

  // Access Tokens
  await fastify.register(getAllAccessTokens);
  await fastify.register(createAccessToken);
  await fastify.register(revokeAccessToken);
  await fastify.register(updateAccessToken);

  // Chains
  await fastify.register(getChainData);
  await fastify.register(getAllChainData);

  // Relayer
  await fastify.register(getAllRelayers);
  await fastify.register(createRelayer);
  await fastify.register(revokeRelayer);
  await fastify.register(updateRelayer);
  await fastify.register(relayTransaction);

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
  await fastify.register(checkGroupStatus);
  await fastify.register(retryTransaction);
  await fastify.register(cancelTransaction);
  await fastify.register(sendSignedTransaction);
  await fastify.register(sendSignedUserOp);

  // Extensions
  await fastify.register(accountFactoryRoutes);
  await fastify.register(accountRoutes);
  await fastify.register(erc20Routes);
  await fastify.register(erc721Routes);
  await fastify.register(erc1155Routes);
  await fastify.register(marketplaceV3Routes);

  // System
  // These should be hidden by default
  await fastify.register(home);
  await fastify.register(healthCheck);
  await fastify.register(queueStatus);
};
