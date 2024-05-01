import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { SmartContract } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { getBlockForIndexing } from "../../db/chainIndexers/getChainIndexer";
import { upsertChainIndexer } from "../../db/chainIndexers/upsertChainIndexer";
import { prisma } from "../../db/client";
import { bulkInsertContractEventLogs } from "../../db/contractEventLogs/createContractEventLogs";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { bulkInsertContractTransactionReceipts } from "../../db/contractTransactionReceipts/createContractTransactionReceipts";
import { PrismaTransaction } from "../../schema/prisma";
import { dedupeArray } from "../../utils/array";
import { getContract } from "../../utils/cache/getContract";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { getContractId } from "../utils/contractId";

export interface GetSubscribedContractsLogsParams {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number; // note: getLogs is inclusive
}

/**
 * Used to abstract eth_getLogs
 * requirement: throw if any of the rpc calls fail, otherwise some contracts will be out of sync
 * @param params
 * @returns ethers.Logs[]
 */
export const ethGetLogs = async (params: GetSubscribedContractsLogsParams) => {
  /* this should use log filter: address: [...contractAddresses] when thirdweb supports */
  const sdk = await getSdk({ chainId: params.chainId });
  const provider = sdk.getProvider();

  const logs = await Promise.all(
    params.contractAddresses.map(async (contractAddress) => {
      const logFilter = {
        address: contractAddress,
        fromBlock: ethers.utils.hexlify(params.fromBlock),
        toBlock: ethers.utils.hexlify(params.toBlock),
      };

      const logs = await provider.getLogs(logFilter);
      return logs;
    }),
  );
  const flatLogs = logs.flat();

  return flatLogs;
};

export const getBlocksAndTransactions = async ({
  chainId,
  fromBlock,
  toBlock,
  contractAddresses,
}: GetSubscribedContractsLogsParams) => {
  const sdk = await getSdk({ chainId: chainId });
  const provider = sdk.getProvider();

  const blockNumbers = Array.from(
    { length: toBlock - fromBlock + 1 },
    (_, index) => fromBlock + index,
  );

  const blocksWithTransactionsAndReceipts = await Promise.all(
    blockNumbers.map(async (blockNumber) => {
      const block = await provider.getBlockWithTransactions(blockNumber);
      const blockTransactionsWithReceipt = await Promise.all(
        block.transactions
          .filter(
            (transaction) =>
              transaction.to &&
              contractAddresses.includes(transaction.to.toLowerCase()),
          )
          .map(async (transaction) => {
            const receipt = await provider.getTransactionReceipt(
              transaction.hash,
            );
            return { transaction, receipt };
          }),
      );
      return { block, blockTransactionsWithReceipt };
    }),
  );

  const blocks: BlockWithTransactions[] = blocksWithTransactionsAndReceipts.map(
    ({ block }) => block,
  );
  const transactionsWithReceipt: {
    receipt: ethers.providers.TransactionReceipt;
    transaction: ethers.Transaction;
  }[] = blocksWithTransactionsAndReceipts.flatMap(
    ({ blockTransactionsWithReceipt }) => blockTransactionsWithReceipt,
  );

  return { blocks, transactionsWithReceipt };
};

export const getSubscribedContractsLogs = async (
  params: GetSubscribedContractsLogsParams,
) => {
  const sdk = await getSdk({ chainId: params.chainId });
  const provider = sdk.getProvider();

  // get the log for the contracts
  const logs = await ethGetLogs(params);

  // cache the contracts and abi
  const uniqueContractAddresses = dedupeArray(logs.map((log) => log.address));
  const contracts = await Promise.all(
    uniqueContractAddresses.map(async (address) => {
      const contract = await getContract({
        chainId: params.chainId,
        contractAddress: address,
      });
      return { contractAddress: address, contract: contract };
    }),
  );
  const contractCache = contracts.reduce((acc, val) => {
    acc[val.contractAddress] = val.contract;
    return acc;
  }, {} as Record<string, SmartContract<ethers.BaseContract>>);

  // cache the blocks and their timestamps
  const uniqueBlockNumbers = dedupeArray(logs.map((log) => log.blockNumber));
  const blockDetails = await Promise.all(
    uniqueBlockNumbers.map(async (blockNumber) => ({
      blockNumber,
      details: await provider.getBlock(blockNumber),
    })),
  );
  const blockCache = blockDetails.reduce((acc, { blockNumber, details }) => {
    acc[blockNumber] = details;
    return acc;
  }, {} as Record<number, ethers.providers.Block>);

  // format the logs to ContractLogEntries
  const formattedLogs = logs.map((log) => {
    const contractAddress = log.address;

    // attempt to decode the log
    let decodedLog;
    let decodedEventName;

    const contract = contractCache[contractAddress];
    if (contract) {
      try {
        const iface = new ethers.utils.Interface(contract.abi);
        const parsedLog = iface.parseLog(log);
        decodedEventName = parsedLog.name;
        decodedLog = parsedLog.eventFragment.inputs.reduce((acc, input) => {
          acc[input.name] = {
            type: input.type,
            value: parsedLog.args[input.name].toString(),
          };
          return acc;
        }, {} as Record<string, { type: string; value: string }>);
      } catch (error) {
        logger({
          service: "worker",
          level: "warn",
          message: `Failed to decode log: chainId: ${params.chainId}, contractAddress ${contractAddress}`,
        });
      }
    }

    // Block may be null if the RPC does not yet have block details. Fall back to current time.
    const block = blockCache[log.blockNumber] as ethers.providers.Block | null;
    const timestamp = block ? new Date(block.timestamp * 1000) : new Date();

    // format the log entry
    return {
      chainId: params.chainId,
      blockNumber: log.blockNumber,
      contractAddress: log.address.toLowerCase(), // ensure common address handling across
      transactionHash: log.transactionHash,
      topic0: log.topics[0],
      topic1: log.topics[1],
      topic2: log.topics[2],
      topic3: log.topics[3],
      data: log.data,
      eventName: decodedEventName,
      decodedLog: decodedLog,
      timestamp,
      transactionIndex: log.transactionIndex,
      logIndex: log.logIndex,
    };
  });

  return formattedLogs;
};

interface IndexFnParams {
  pgtx: PrismaTransaction;
  chainId: number;
  fromBlockNumber: number;
  toBlockNumber: number; // INCLUSIVE
  subscribedContractAddresses: string[];
}

const indexContractEvents = async ({
  pgtx,
  chainId,
  fromBlockNumber,
  toBlockNumber,
  subscribedContractAddresses,
}: IndexFnParams) => {
  // get all logs for the contracts
  const logs = await getSubscribedContractsLogs({
    chainId,
    fromBlock: fromBlockNumber,
    toBlock: toBlockNumber,
    contractAddresses: subscribedContractAddresses,
  });

  // update the logs
  if (logs.length > 0) {
    await bulkInsertContractEventLogs({ logs, pgtx });
  }
};

const indexTransactionReceipts = async ({
  pgtx,
  chainId,
  fromBlockNumber,
  toBlockNumber,
  subscribedContractAddresses,
}: IndexFnParams) => {
  const { blocks, transactionsWithReceipt } = await getBlocksAndTransactions({
    chainId,
    fromBlock: fromBlockNumber,
    toBlock: toBlockNumber,
    contractAddresses: subscribedContractAddresses,
  });

  const blockLookup = blocks.reduce((acc, curr) => {
    acc[curr.number] = curr;
    return acc;
  }, {} as Record<number, BlockWithTransactions>);

  const txReceipts = transactionsWithReceipt.map(({ receipt, transaction }) => {
    return {
      chainId: chainId,
      blockNumber: receipt.blockNumber,
      contractAddress: receipt.to.toLowerCase(),
      contractId: getContractId(chainId, receipt.to.toLowerCase()),
      transactionHash: receipt.transactionHash.toLowerCase(),
      blockHash: receipt.blockHash.toLowerCase(),
      timestamp: new Date(blockLookup[receipt.blockNumber].timestamp * 1000),
      to: receipt.to.toLowerCase(),
      from: receipt.from.toLowerCase(),
      value: transaction.value.toString(),
      data: transaction.data,
      transactionIndex: receipt.transactionIndex,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice.toString(),
      status: receipt.status ?? 1, // requires post-byzantium
    };
  });

  if (txReceipts.length > 0) {
    await bulkInsertContractTransactionReceipts({
      txReceipts: txReceipts,
      pgtx,
    });
  }
};

export const createChainIndexerTask = async (
  chainId: number,
  maxBlocksToIndex: number,
) => {
  const chainIndexerTask = async () => {
    try {
      await prisma.$transaction(
        async (pgtx) => {
          let lastIndexedBlock;
          try {
            lastIndexedBlock = await getBlockForIndexing({ chainId, pgtx });
          } catch (error) {
            // row is locked, return
            return;
          }

          const sdk = await getSdk({ chainId });
          const provider = sdk.getProvider();

          // Get latest block with logs. This should be the maxBlock to query up to.
          const logs = await provider.getLogs({ fromBlock: "latest" });
          if (logs.length === 0) {
            return;
          }
          const currentBlockNumber = logs[0].blockNumber;

          // Check if up-to-date.
          if (lastIndexedBlock >= currentBlockNumber) {
            return;
          }

          // Limit max block number.
          const toBlockNumber = Math.min(
            currentBlockNumber,
            lastIndexedBlock + maxBlocksToIndex,
          );

          const subscribedContracts = await getContractSubscriptionsByChainId(
            chainId,
          );
          const subscribedContractAddresses = dedupeArray(
            subscribedContracts.map(
              (subscribedContract) => subscribedContract.contractAddress,
            ),
          );

          await Promise.all([
            // Checks eth_getLogs.
            indexContractEvents({
              pgtx,
              chainId,
              fromBlockNumber: lastIndexedBlock,
              toBlockNumber,
              subscribedContractAddresses,
            }),
            // Checks eth_getBlockByNumber.
            indexTransactionReceipts({
              pgtx,
              chainId,
              fromBlockNumber: lastIndexedBlock,
              toBlockNumber,
              subscribedContractAddresses,
            }),
          ]);

          // Update the last processed block number.
          await upsertChainIndexer({
            pgtx,
            chainId,
            currentBlockNumber: toBlockNumber,
          });
        },
        {
          timeout: 5 * 60 * 1000,
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
