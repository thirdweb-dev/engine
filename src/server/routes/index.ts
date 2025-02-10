import type { FastifyInstance } from "fastify";
import { getNonceDetailsRoute } from "./admin/nonces.js";
import { getTransactionDetails } from "./admin/transaction.js";
import { createAccessToken } from "./auth/access-tokens/create.js";
import { getAllAccessTokens } from "./auth/access-tokens/get-all.js";
import { revokeAccessToken } from "./auth/access-tokens/revoke.js";
import { updateAccessToken } from "./auth/access-tokens/update.js";
import { addKeypair } from "./auth/keypair/add.js";
import { listPublicKeys } from "./auth/keypair/list.js";
import { removePublicKey } from "./auth/keypair/remove.js";
import { getAllPermissions } from "./auth/permissions/get-all.js";
import { grantPermissions } from "./auth/permissions/grant.js";
import { revokePermissions } from "./auth/permissions/revoke.js";
import { cancelBackendWalletNoncesRoute } from "./backend-wallet/cancel-nonces.js";
import { createBackendWallet } from "./backend-wallet/create.js";
import { getAll } from "./backend-wallet/get-all.js";
import { getBalance } from "./backend-wallet/get-balance.js";
import { getBackendWalletNonce } from "./backend-wallet/get-nonce.js";
import { getTransactionsForBackendWallet } from "./backend-wallet/get-transactions.js";
import { getTransactionsForBackendWalletByNonce } from "./backend-wallet/get-transactions-by-nonce.js";
import { importBackendWallet } from "./backend-wallet/import.js";
import { removeBackendWallet } from "./backend-wallet/remove.js";
import { resetBackendWalletNoncesRoute } from "./backend-wallet/reset-nonces.js";
import { sendTransaction } from "./backend-wallet/send-transaction.js";
import { sendTransactionBatch } from "./backend-wallet/send-transaction-batch.js";
import { signMessageRoute } from "./backend-wallet/sign-message.js";
import { signTransaction } from "./backend-wallet/sign-transaction.js";
import { signTypedData } from "./backend-wallet/sign-typed-data.js";
import { simulateTransaction } from "./backend-wallet/simulate-transaction.js";
import { transfer } from "./backend-wallet/transfer.js";
import { updateBackendWallet } from "./backend-wallet/update.js";
import { withdraw } from "./backend-wallet/withdraw.js";
import { getChainData } from "./chain/get.js";
import { getAllChainData } from "./chain/get-all.js";
import { getAuthConfiguration } from "./configuration/auth/get.js";
import { updateAuthConfiguration } from "./configuration/auth/update.js";
import { getBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/get.js";
import { updateBackendWalletBalanceConfiguration } from "./configuration/backend-wallet-balance/update.js";
import { getCacheConfiguration } from "./configuration/cache/get.js";
import { updateCacheConfiguration } from "./configuration/cache/update.js";
import { getChainsConfiguration } from "./configuration/chains/get.js";
import { updateChainsConfiguration } from "./configuration/chains/update.js";
import { getContractSubscriptionsConfiguration } from "./configuration/contract-subscriptions/get.js";
import { updateContractSubscriptionsConfiguration } from "./configuration/contract-subscriptions/update.js";
import { addUrlToCorsConfiguration } from "./configuration/cors/add.js";
import { getCorsConfiguration } from "./configuration/cors/get.js";
import { removeUrlToCorsConfiguration } from "./configuration/cors/remove.js";
import { setUrlsToCorsConfiguration } from "./configuration/cors/set.js";
import { getIpAllowlist } from "./configuration/ip/get.js";
import { setIpAllowlist } from "./configuration/ip/set.js";
import { getTransactionConfiguration } from "./configuration/transactions/get.js";
import { updateTransactionConfiguration } from "./configuration/transactions/update.js";
import { getWalletsConfiguration } from "./configuration/wallets/get.js";
import { updateWalletsConfiguration } from "./configuration/wallets/update.js";
import { getAllEvents } from "./contract/events/get-all-events.js";
import { getContractEventLogs } from "./contract/events/get-contract-event-logs.js";
import { getEventLogs } from "./contract/events/get-event-logs-by-timestamp.js";
import { getEvents } from "./contract/events/get-events.js";
import { pageEventLogs } from "./contract/events/paginate-event-logs.js";
import { accountRoutes } from "./contract/extensions/account/index.js";
import { accountFactoryRoutes } from "./contract/extensions/account-factory/index.js";
import { erc1155Routes } from "./contract/extensions/erc1155/index.js";
import { erc20Routes } from "./contract/extensions/erc20/index.js";
import { erc721Routes } from "./contract/extensions/erc721/index.js";
import { marketplaceV3Routes } from "./contract/extensions/marketplace-v3/index.js";
import { getABI } from "./contract/metadata/abi.js";
import { extractEvents } from "./contract/metadata/events.js";
import { getContractExtensions } from "./contract/metadata/extensions.js";
import { extractFunctions } from "./contract/metadata/functions.js";
import { readContract } from "./contract/read/read.js";
import { getRoles } from "./contract/roles/read/get.js";
import { getAllRoles } from "./contract/roles/read/get-all.js";
import { grantRole } from "./contract/roles/write/grant.js";
import { revokeRole } from "./contract/roles/write/revoke.js";
import { getDefaultRoyaltyInfo } from "./contract/royalties/read/get-default-royalty-info.js";
import { getTokenRoyaltyInfo } from "./contract/royalties/read/get-token-royalty-info.js";
import { setDefaultRoyaltyInfo } from "./contract/royalties/write/set-default-royalty-info.js";
import { setTokenRoyaltyInfo } from "./contract/royalties/write/set-token-royalty-info.js";
import { addContractSubscription } from "./contract/subscriptions/add-contract-subscription.js";
import { getContractIndexedBlockRange } from "./contract/subscriptions/get-contract-indexed-block-range.js";
import { getContractSubscriptions } from "./contract/subscriptions/get-contract-subscriptions.js";
import { getLatestBlock } from "./contract/subscriptions/get-latest-block.js";
import { removeContractSubscription } from "./contract/subscriptions/remove-contract-subscription.js";
import { getContractTransactionReceipts } from "./contract/transactions/get-transaction-receipts.js";
import { getContractTransactionReceiptsByTimestamp } from "./contract/transactions/get-transaction-receipts-by-timestamp.js";
import { pageTransactionReceipts } from "./contract/transactions/paginate-transaction-receipts.js";
import { writeToContract } from "./contract/write/write.js";
import { prebuiltsRoutes } from "./deploy/index.js";
import { home } from "./home.js";
import { relayTransaction } from "./relayer/index.js";
import { createRelayer } from "./relayer/create.js";
import { getAllRelayers } from "./relayer/get-all.js";
import { revokeRelayer } from "./relayer/revoke.js";
import { updateRelayer } from "./relayer/update.js";
import { healthCheck } from "./system/health.js";
import { queueStatus } from "./system/queue.js";
import { getTransactionLogs } from "./transaction/blockchain/get-logs.js";
import { getTransactionReceipt } from "./transaction/blockchain/get-receipt.js";
import { getUserOpReceipt } from "./transaction/blockchain/get-user-op-receipt.js";
import { sendSignedTransaction } from "./transaction/blockchain/send-signed-tx.js";
import { sendSignedUserOp } from "./transaction/blockchain/send-signed-user-op.js";
import { cancelTransaction } from "./transaction/cancel.js";
import { getAllTransactions } from "./transaction/get-all.js";
import { getAllDeployedContracts } from "./transaction/get-all-deployed-contracts.js";
import { retryTransaction } from "./transaction/retry.js";
import { retryFailedTransactionRoute } from "./transaction/retry-failed.js";
import { checkTxStatus } from "./transaction/status.js";
import { syncRetryTransactionRoute } from "./transaction/sync-retry.js";
import { createWebhookRoute } from "./webhooks/create.js";
import { getWebhooksEventTypes } from "./webhooks/events.js";
import { getAllWebhooksData } from "./webhooks/get-all.js";
import { revokeWebhook } from "./webhooks/revoke.js";
import { testWebhookRoute } from "./webhooks/test.js";
import { readBatchRoute } from "./contract/read/read-batch.js";
import { sendTransactionBatchAtomicRoute } from "./backend-wallet/send-transaction-batch-atomic.js";
import { createWalletCredentialRoute } from "./wallet-credentials/create.js";
import { getWalletCredentialRoute } from "./wallet-credentials/get.js";
import { getAllWalletCredentialsRoute } from "./wallet-credentials/get-all.js";
import { updateWalletCredentialRoute } from "./wallet-credentials/update.js";

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
  await fastify.register(sendTransactionBatchAtomicRoute);
  await fastify.register(signTransaction);
  await fastify.register(signMessageRoute);
  await fastify.register(signTypedData);
  await fastify.register(getTransactionsForBackendWallet);
  await fastify.register(getTransactionsForBackendWalletByNonce);
  await fastify.register(resetBackendWalletNoncesRoute);
  await fastify.register(cancelBackendWalletNoncesRoute);
  await fastify.register(getBackendWalletNonce);
  await fastify.register(simulateTransaction);

  // Credentials
  await fastify.register(createWalletCredentialRoute);
  await fastify.register(getWalletCredentialRoute);
  await fastify.register(getAllWalletCredentialsRoute);
  await fastify.register(updateWalletCredentialRoute);

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
  await fastify.register(readBatchRoute);
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
