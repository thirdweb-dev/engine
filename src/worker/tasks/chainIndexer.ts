import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { SmartContract } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { getBlockForIndexing } from "../../db/chainIndexers/getChainIndexer";
import { upsertChainIndexer } from "../../db/chainIndexers/upsertChainIndexer";
import { prisma } from "../../db/client";
import { bulkInsertContractEventLogs } from "../../db/contractEventLogs/createContractEventLogs";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { bulkInsertContractTransactionReceipts } from "../../db/contractTransactionReceipts/createContractTransactionReceipts";
import { getConfig } from "../../utils/cache/getConfig";
import { getContract } from "../../utils/cache/getContract";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { getContractId } from "../utils/contractId";

export interface GetSubscribedContractsLogsParams {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
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

  const blocks: BlockWithTransactions[] = [];
  const transactionsWithReceipt: {
    receipt: ethers.providers.TransactionReceipt;
    transaction: ethers.Transaction;
  }[] = [];

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
    const block = await provider.getBlockWithTransactions(blockNumber);
    blocks.push(block);

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

    transactionsWithReceipt.push(...blockTransactionsWithReceipt);
  }

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
  const uniqueContractAddresses = [
    ...new Set<string>(logs.map((log) => log.address)),
  ];
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
  const uniqueBlockNumbers = [
    ...new Set<number>(logs.map((log) => log.blockNumber)),
  ];
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

    const block = blockCache[log.blockNumber];

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
      timestamp: new Date(block.timestamp * 1000), // ethers timestamp is s, Date uses ms
      transactionIndex: log.transactionIndex,
      logIndex: log.logIndex,
    };
  });

  return formattedLogs;
};

export const createChainIndexerTask = async (chainId: number) => {
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
          const config = await getConfig();

          const provider = sdk.getProvider();
          const currentBlockNumber = await provider.getBlockNumber();

          // check if up-to-date
          if (lastIndexedBlock >= currentBlockNumber) {
            return;
          }

          // limit max block numbers
          let toBlockNumber = currentBlockNumber;
          if (
            currentBlockNumber - (lastIndexedBlock + 1) >
            config.maxBlocksToIndex
          ) {
            toBlockNumber = lastIndexedBlock + 1 + config.maxBlocksToIndex;
          }

          // get contracts to index
          const subscribedContracts = await getContractSubscriptionsByChainId(
            chainId,
          );
          const subscribedContractAddresses = [
            ...new Set<string>(
              subscribedContracts.map(
                (subscribedContract) => subscribedContract.contractAddress,
              ),
            ),
          ];

          // get all logs for the contracts
          const logs = await getSubscribedContractsLogs({
            chainId,
            fromBlock: lastIndexedBlock + 1,
            toBlock: toBlockNumber,
            contractAddresses: subscribedContractAddresses,
          });

          // update the logs
          if (logs.length > 0) {
            await bulkInsertContractEventLogs({ logs, pgtx });
          }

          const { blocks, transactionsWithReceipt } =
            await getBlocksAndTransactions({
              chainId,
              fromBlock: lastIndexedBlock + 1,
              toBlock: toBlockNumber,
              contractAddresses: subscribedContractAddresses,
            });

          const blockLookup = blocks.reduce((acc, curr) => {
            acc[curr.number] = curr;
            return acc;
          }, {} as Record<number, BlockWithTransactions>);

          const txReceipts = transactionsWithReceipt.map(
            ({ receipt, transaction }) => {
              return {
                chainId: chainId,
                blockNumber: receipt.blockNumber,
                contractAddress: receipt.to.toLowerCase(),
                contractId: getContractId(chainId, receipt.to.toLowerCase()),
                transactionHash: receipt.transactionHash.toLowerCase(),
                blockHash: receipt.blockHash.toLowerCase(),
                timestamp: new Date(blockLookup[receipt.blockNumber].timestamp),
                to: receipt.to.toLowerCase(),
                from: receipt.from.toLowerCase(),
                value: transaction.value.toString(),
                data: transaction.data,
                transactionIndex: receipt.transactionIndex,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice.toString(),
                status: receipt.status ?? 1, // requires post-byzantium
              };
            },
          );

          if (txReceipts.length > 0) {
            await bulkInsertContractTransactionReceipts({
              txReceipts: txReceipts,
              pgtx,
            });
          }

          // update the block number
          try {
            await upsertChainIndexer({
              pgtx,
              chainId,
              currentBlockNumber: toBlockNumber,
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
