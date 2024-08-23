import { StaticJsonRpcBatchProvider } from "@thirdweb-dev/sdk";
import { Address } from "thirdweb";
import { getBlockForIndexing } from "../../db/chainIndexers/getChainIndexer";
import { upsertChainIndexer } from "../../db/chainIndexers/upsertChainIndexer";
import { prisma } from "../../db/client";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { ProcessEventsLogQueue } from "../queues/processEventLogsQueue";
import { ProcessTransactionReceiptsQueue } from "../queues/processTransactionReceiptsQueue";

export const createChainIndexerTask = async (args: {
  chainId: number;
  maxBlocksToIndex: number;
  toBlockOffset: number;
}) => {
  const { chainId, maxBlocksToIndex, toBlockOffset } = args;

  const chainIndexerTask = async () => {
    try {
      await prisma.$transaction(
        async (pgtx) => {
          let fromBlock;
          try {
            fromBlock = await getBlockForIndexing({ chainId, pgtx });
          } catch (error) {
            // row is locked, return
            return;
          }

          const sdk = await getSdk({ chainId });
          const provider = sdk.getProvider();
          const currentBlockNumber =
            (await provider.getBlockNumber()) - toBlockOffset;

          // Limit toBlock to avoid hitting rate or block range limits when querying logs.
          const toBlock = Math.min(
            currentBlockNumber,
            fromBlock + maxBlocksToIndex,
          );

          // No-op if fromBlock is already up-to-date.
          if (fromBlock >= toBlock) {
            return;
          }

          // Ensure that the block data exists.
          // Sometimes the RPC nodes do not yet return data for the latest block.
          const block = await provider.getBlockWithTransactions(toBlock);
          if (!block) {
            logger({
              service: "worker",
              level: "warn",
              message: `Block data not available: ${toBlock} on chain: ${chainId}, url: ${
                (provider as StaticJsonRpcBatchProvider).connection.url
              }. Will retry in the next cycle.`,
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
              message: `Failed to update latest block number - Chain Indexer: ${chainId}`,
              error: error,
            });
          }
        },
        {
          timeout: 60 * 1000, // 1 minute timeout
        },
      );
    } catch (err: any) {
      logger({
        service: "worker",
        level: "error",
        message: `Failed to index: ${chainId}`,
        error: err,
      });
    }
  };

  return chainIndexerTask;
};
