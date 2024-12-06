import type { FastifyInstance } from "fastify";
import { getNonceDetailsRoute } from "./admin/nonces";
import { getTransactionDetails } from "./admin/transaction";
import { createAccessToken } from "./auth/access-tokens/create";
import { getAllAccessTokens } from "./auth/access-tokens/getAll";
import { revokeAccessToken } from "./auth/access-tokens/revoke";
import { updateAccessToken } from "./auth/access-tokens/update";
import { addKeypair } from "./auth/keypair/add";
import { listPublicKeys } from "./auth/keypair/list";
import { removePublicKey } from "./auth/keypair/remove";
import { getAllPermissions } from "./auth/permissions/getAll";
import { grantPermissions } from "./auth/permissions/grant";
import { revokePermissions } from "./auth/permissions/revoke";
import { cancelBackendWalletNoncesRoute } from "./backend-wallet/cancel-nonces";
import { createBackendWallet } from "./backend-wallet/create";
import { getAll } from "./backend-wallet/getAll";
import { getBalance } from "./backend-wallet/getBalance";
import { getBackendWalletNonce } from "./backend-wallet/getNonce";
import { getTransactionsForBackendWallet } from "./backend-wallet/getTransactions";
import { getTransactionsForBackendWalletByNonce } from "./backend-wallet/getTransactionsByNonce";
import { importBackendWallet } from "./backend-wallet/import";
import { removeBackendWallet } from "./backend-wallet/remove";
import { resetBackendWalletNoncesRoute } from "./backend-wallet/reset-nonces";
import { sendTransaction } from "./backend-wallet/sendTransaction";
import { sendTransactionBatch } from "./backend-wallet/sendTransactionBatch";
import { signMessageRoute } from "./backend-wallet/signMessage";
import { signTransaction } from "./backend-wallet/signTransaction";
import { signTypedData } from "./backend-wallet/signTypedData";
import { simulateTransaction } from "./backend-wallet/simulateTransaction";
import { transfer } from "./backend-wallet/transfer";
import { updateBackendWallet } from "./backend-wallet/update";
import { withdraw } from "./backend-wallet/withdraw";
import { getChainData } from "./chain/get";
import { getAllChainData } from "./chain/getAll";
import { getAuthConfiguration } from "./configuration/auth/get";
import { updateAuthConfiguration } from "./configuration/auth/update";
import { getBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/get";
import { updateBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/update";
import { getCacheConfiguration } from "./configuration/cache/get";
import { updateCacheConfiguration } from "./configuration/cache/update";
import { getChainsConfiguration } from "./configuration/chains/get";
import { updateChainsConfiguration } from "./configuration/chains/update";
import { getContractSubscriptionsConfiguration } from "./configuration/contract-subscriptions/get";
import { updateContractSubscriptionsConfiguration } from "./configuration/contract-subscriptions/update";
import { addUrlToCorsConfiguration } from "./configuration/cors/add";
import { getCorsConfiguration } from "./configuration/cors/get";
import { removeUrlToCorsConfiguration } from "./configuration/cors/remove";
import { setUrlsToCorsConfiguration } from "./configuration/cors/set";
import { getIpAllowlist } from "./configuration/ip/get";
import { setIpAllowlist } from "./configuration/ip/set";
import { getTransactionConfiguration } from "./configuration/transactions/get";
import { updateTransactionConfiguration } from "./configuration/transactions/update";
import { getWalletsConfiguration } from "./configuration/wallets/get";
import { updateWalletsConfiguration } from "./configuration/wallets/update";
import { getAllEvents } from "./contract/events/getAllEvents";
import { getContractEventLogs } from "./contract/events/getContractEventLogs";
import { getEventLogs } from "./contract/events/getEventLogsByTimestamp";
import { getEvents } from "./contract/events/getEvents";
import { pageEventLogs } from "./contract/events/paginateEventLogs";
import { accountRoutes } from "./contract/extensions/account";
import { accountFactoryRoutes } from "./contract/extensions/accountFactory";
import { erc1155Routes } from "./contract/extensions/erc1155";
import { erc20Routes } from "./contract/extensions/erc20";
import { erc721Routes } from "./contract/extensions/erc721";
import { marketplaceV3Routes } from "./contract/extensions/marketplaceV3/index";
import { getABI } from "./contract/metadata/abi";
import { extractEvents } from "./contract/metadata/events";
import { getContractExtensions } from "./contract/metadata/extensions";
import { extractFunctions } from "./contract/metadata/functions";
import { readContract } from "./contract/read/read";
import { getRoles } from "./contract/roles/read/get";
import { getAllRoles } from "./contract/roles/read/getAll";
import { grantRole } from "./contract/roles/write/grant";
import { revokeRole } from "./contract/roles/write/revoke";
import { getDefaultRoyaltyInfo } from "./contract/royalties/read/getDefaultRoyaltyInfo";
import { getTokenRoyaltyInfo } from "./contract/royalties/read/getTokenRoyaltyInfo";
import { setDefaultRoyaltyInfo } from "./contract/royalties/write/setDefaultRoyaltyInfo";
import { setTokenRoyaltyInfo } from "./contract/royalties/write/setTokenRoyaltyInfo";
import { addContractSubscription } from "./contract/subscriptions/addContractSubscription";
import { getContractIndexedBlockRange } from "./contract/subscriptions/getContractIndexedBlockRange";
import { getContractSubscriptions } from "./contract/subscriptions/getContractSubscriptions";
import { getLatestBlock } from "./contract/subscriptions/getLatestBlock";
import { removeContractSubscription } from "./contract/subscriptions/removeContractSubscription";
import { getContractTransactionReceipts } from "./contract/transactions/getTransactionReceipts";
import { getContractTransactionReceiptsByTimestamp } from "./contract/transactions/getTransactionReceiptsByTimestamp";
import { pageTransactionReceipts } from "./contract/transactions/paginateTransactionReceipts";
import { writeToContract } from "./contract/write/write";
import { prebuiltsRoutes } from "./deploy";
import { home } from "./home";
import { relayTransaction } from "./relayer";
import { createRelayer } from "./relayer/create";
import { getAllRelayers } from "./relayer/getAll";
import { revokeRelayer } from "./relayer/revoke";
import { updateRelayer } from "./relayer/update";
import { healthCheck } from "./system/health";
import { queueStatus } from "./system/queue";
import { getTransactionLogs } from "./transaction/blockchain/getLogs";
import { getTransactionReceipt } from "./transaction/blockchain/getReceipt";
import { getUserOpReceipt } from "./transaction/blockchain/getUserOpReceipt";
import { sendSignedTransaction } from "./transaction/blockchain/sendSignedTx";
import { sendSignedUserOp } from "./transaction/blockchain/sendSignedUserOp";
import { cancelTransaction } from "./transaction/cancel";
import { getAllTransactions } from "./transaction/getAll";
import { getAllDeployedContracts } from "./transaction/getAllDeployedContracts";
import { retryTransaction } from "./transaction/retry";
import { retryFailedTransactionRoute } from "./transaction/retry-failed";
import { checkTxStatus } from "./transaction/status";
import { syncRetryTransactionRoute } from "./transaction/sync-retry";
import { createWebhookRoute } from "./webhooks/create";
import { getWebhooksEventTypes } from "./webhooks/events";
import { getAllWebhooksData } from "./webhooks/getAll";
import { revokeWebhook } from "./webhooks/revoke";
import { testWebhookRoute } from "./webhooks/test";

export async function withRoutes(fastify: FastifyInstance) {
  // Backend Wallets
  await fastify.register(createBackendWallet);
  await fastify.register(removeBackendWallet);
  await fastify.register(importBackendWallet);
  await fastify.register(updateBackendWallet);
  await fastify.register(getBalance);
  await fastify.register(getAll);
  await fastify.register(transfer);
  await fastify.register(withdraw);
  await fastify.register(sendTransaction);
  await fastify.register(sendTransactionBatch);
  await fastify.register(signTransaction);
  await fastify.register(signMessageRoute);
  await fastify.register(signTypedData);
  await fastify.register(getTransactionsForBackendWallet);
  await fastify.register(getTransactionsForBackendWalletByNonce);
  await fastify.register(resetBackendWalletNoncesRoute);
  await fastify.register(cancelBackendWalletNoncesRoute);
  await fastify.register(getBackendWalletNonce);
  await fastify.register(simulateTransaction);

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
  await fastify.register(setUrlsToCorsConfiguration);
  await fastify.register(getCacheConfiguration);
  await fastify.register(updateCacheConfiguration);
  await fastify.register(getContractSubscriptionsConfiguration);
  await fastify.register(updateContractSubscriptionsConfiguration);
  await fastify.register(getIpAllowlist);
  await fastify.register(setIpAllowlist);

  // Webhooks
  await fastify.register(getAllWebhooksData);
  await fastify.register(createWebhookRoute);
  await fastify.register(revokeWebhook);
  await fastify.register(getWebhooksEventTypes);
  await fastify.register(testWebhookRoute);

  // Permissions
  await fastify.register(getAllPermissions);
  await fastify.register(grantPermissions);
  await fastify.register(revokePermissions);

  // Access Tokens
  await fastify.register(getAllAccessTokens);
  await fastify.register(createAccessToken);
  await fastify.register(revokeAccessToken);
  await fastify.register(updateAccessToken);

  // Keypairs
  await fastify.register(listPublicKeys);
  await fastify.register(addKeypair);
  await fastify.register(removePublicKey);

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
  await fastify.register(getAllTransactions);
  await fastify.register(checkTxStatus);
  await fastify.register(getAllDeployedContracts);
  await fastify.register(retryTransaction);
  await fastify.register(syncRetryTransactionRoute);
  await fastify.register(retryFailedTransactionRoute);
  await fastify.register(cancelTransaction);
  await fastify.register(sendSignedTransaction);
  await fastify.register(sendSignedUserOp);
  await fastify.register(getTransactionReceipt);
  await fastify.register(getUserOpReceipt);
  await fastify.register(getTransactionLogs);

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

  // Contract Subscriptions
  await fastify.register(getContractSubscriptions);
  await fastify.register(addContractSubscription);
  await fastify.register(removeContractSubscription);
  await fastify.register(getContractIndexedBlockRange);
  await fastify.register(getLatestBlock);

  // Contract Transactions
  // @deprecated
  await fastify.register(getContractTransactionReceipts);
  await fastify.register(getContractTransactionReceiptsByTimestamp);
  await fastify.register(pageTransactionReceipts);

  // Contract Event Logs
  // @deprecated
  await fastify.register(getContractEventLogs);
  await fastify.register(getEventLogs);
  await fastify.register(pageEventLogs);

  // Admin
  await fastify.register(getTransactionDetails);
  await fastify.register(getNonceDetailsRoute);
}
