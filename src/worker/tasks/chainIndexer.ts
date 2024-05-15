import { StaticJsonRpcBatchProvider } from "@thirdweb-dev/sdk";
import { getBlockForIndexing } from "../../db/chainIndexers/getChainIndexer";
import { upsertChainIndexer } from "../../db/chainIndexers/upsertChainIndexer";
import { prisma } from "../../db/client";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { enqueueProcessEventLogs } from "../queues/processEventLogsQueue";
import { enqueueProcessTransactionReceipts } from "../queues/processTransactionReceiptsQueue";

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

          // Limit toBlock to avoid hitting rate or file size limits when querying logs.
          const toBlock = Math.min(
            currentBlockNumber,
            fromBlock + maxBlocksToIndex,
          );

          // No-op if fromBlock is already up-to-date.
          if (fromBlock >= toBlock) {
            return;
          }

          // Ensuring that the block data exists.
          // Sometimes the RPC providers nodes are aware of the latest block
          // but the block data is not available yet.
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

          // Get contract addresses to filter event logs and transaction receipts by.
          const contractSubscriptions = await getContractSubscriptionsByChainId(
            chainId,
            true,
          );
          const contractAddresses = [
            ...new Set<string>(
              contractSubscriptions.map(
                (subscription) => subscription.contractAddress,
              ),
            ),
          ];

          await enqueueProcessEventLogs({
            chainId,
            fromBlock,
            toBlock,
            contractAddresses,
          });

          await enqueueProcessTransactionReceipts({
            chainId,
            fromBlock,
            toBlock,
            contractAddresses,
          });

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
          timeout: 5 * 60000, // 3 minutes timeout
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
