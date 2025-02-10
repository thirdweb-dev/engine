import {
  eth_blockNumber,
  eth_getBlockByNumber,
  getRpcClient,
  type Address,
} from "thirdweb";
import { getBlockForIndexing } from "../../shared/db/chain-indexers/get-chain-indexer.js";
import { upsertChainIndexer } from "../../shared/db/chain-indexers/upsert-chain-indexer.js";
import { prisma } from "../../shared/db/client.js";
import { getContractSubscriptionsByChainId } from "../../shared/db/contract-subscriptions/get-contract-subscriptions.js";
import { getChain } from "../../shared/utils/chain.js";
import { logger } from "../../shared/utils/logger.js";
import { thirdwebClient } from "../../shared/utils/sdk.js";
import { ProcessEventsLogQueue } from "../queues/process-event-logs-queue.js";
import { ProcessTransactionReceiptsQueue } from "../queues/process-transaction-receipts-queue.js";

// A reasonable block range that is within RPC limits.
// The minimum job time is 1 second, so this value should higher than the # blocks per second
// on any chain to allow catching up if delayed.
const MAX_BLOCK_RANGE = 500;

export const handleContractSubscriptions = async (chainId: number) => {
  const chain = await getChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  await prisma.$transaction(
    async (pgtx) => {
      let fromBlock: number;
      try {
        fromBlock = await getBlockForIndexing({ chainId, pgtx });
      } catch {
        // row is locked, return
        return;
      }

      // Cap the range to avoid hitting rate limits or block range limits from RPC.
      const latestBlockNumber = await eth_blockNumber(rpcRequest);
      const toBlock = Math.min(
        Number(latestBlockNumber),
        fromBlock + MAX_BLOCK_RANGE,
      );

      // No-op if fromBlock is already up-to-date.
      if (fromBlock >= toBlock) {
        return;
      }

      // Ensure that the block data exists.
      // Sometimes the RPC nodes do not yet return data for the latest block.
      const block = await eth_getBlockByNumber(rpcRequest, {
        blockNumber: BigInt(toBlock),
      });
      if (!block) {
        logger({
          service: "worker",
          level: "warn",
          message: `Block ${toBlock} data not available on chain ${chainId} yet.`,
        });
        return;
      }

      const contractSubscriptions = await getContractSubscriptionsByChainId(
        chainId,
        true,
      );

      // Identify contract addresses + event names to parse event logs, if any.
      const eventLogFilters: {
        address: Address;
        events: string[];
      }[] = contractSubscriptions
        .filter((c) => c.processEventLogs)
        .map((c) => ({
          address: c.contractAddress as Address,
          events: c.filterEvents,
        }));
      if (eventLogFilters.length > 0) {
        await ProcessEventsLogQueue.add({
          chainId,
          fromBlock,
          toBlock,
          filters: eventLogFilters,
        });
      }

      // Identify addresses + function names to parse transaction receipts, if any.
      const transactionReceiptFilters: {
        address: Address;
        functions: string[];
      }[] = contractSubscriptions
        .filter((c) => c.processTransactionReceipts)
        .map((c) => ({
          address: c.contractAddress as Address,
          functions: c.filterFunctions,
        }));
      if (transactionReceiptFilters.length > 0) {
        await ProcessTransactionReceiptsQueue.add({
          chainId,
          fromBlock,
          toBlock,
          filters: transactionReceiptFilters,
        });
      }

      // Update the latest block number.
      try {
        await upsertChainIndexer({
          pgtx,
          chainId,
          currentBlockNumber: toBlock,
        });
      } catch (error) {
        logger({
          service: "worker",
          level: "error",
          message: `Updating latest block number on chain ${chainId}`,
          error,
        });
      }
    },
    {
      timeout: 60 * 1000,
    },
  );
};
