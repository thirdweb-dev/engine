import { Log } from "@ethersproject/abstract-provider";
import { Prisma, Webhooks } from "@prisma/client";
import { SmartContract } from "@thirdweb-dev/sdk";
import { Job, Processor, Worker } from "bullmq";
import ethers from "ethers";
import superjson from "superjson";
import { bulkInsertContractEventLogs } from "../../db/contractEventLogs/createContractEventLogs";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { getContract } from "../../utils/cache/getContract";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import {
  EnqueueProcessEventLogsData,
  PROCESS_EVENT_LOGS_QUEUE_NAME,
} from "../queues/processEventLogsQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueWebhook } from "../queues/sendWebhookQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { chainId, contractAddresses, fromBlock, toBlock } =
    superjson.parse<EnqueueProcessEventLogsData>(job.data);

  const logs = await getLogs({
    chainId,
    fromBlock,
    toBlock,
    contractAddresses,
  });
  if (logs.length === 0) {
    return;
  }

  // Get webhooks.
  const webhooksByContractAddress = await getWebhooksByContractAddresses(
    chainId,
  );

  // Store logs to DB.
  const insertedLogs = await bulkInsertContractEventLogs({ logs });

  // Enqueue webhooks.
  // This step should happen immediately after inserting to DB.
  for (const eventLog of insertedLogs) {
    const webhooks = webhooksByContractAddress[eventLog.contractAddress] ?? [];
    for (const webhook of webhooks) {
      await enqueueWebhook({
        type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION,
        webhook,
        eventLog,
      });
    }
  }

  // Any logs inserted in a delayed job indicates missed logs in the realtime job.
  if (job.delay > 0) {
    logger({
      service: "worker",
      level: "warn",
      message: `Found ${insertedLogs.length} logs on ${chainId} after ${
        job.delay / 1000
      }s.`,
    });
  }
};

export const getWebhooksByContractAddresses = async (
  chainId: number,
): Promise<Record<string, Webhooks[]>> => {
  const contractSubscriptions = await getContractSubscriptionsByChainId(
    chainId,
    true,
  );

  // Map { contractAddress => array of webhooks }
  const webhooksByContractAddress: Record<string, Webhooks[]> = {};
  for (const { contractAddress, webhook } of contractSubscriptions) {
    if (webhook) {
      if (!webhooksByContractAddress[contractAddress]) {
        webhooksByContractAddress[contractAddress] = [];
      }
      webhooksByContractAddress[contractAddress].push(webhook);
    }
  }
  return webhooksByContractAddress;
};

interface GetLogsParams {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
}

const getLogs = async (
  params: GetLogsParams,
): Promise<Prisma.ContractEventLogsCreateInput[]> => {
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

// Calls eth_getLogs with an address filter for each contract address.
export const ethGetLogs = async (params: GetLogsParams): Promise<Log[]> => {
  /* this should use log filter: address: [...contractAddresses] when thirdweb supports */
  const sdk = await getSdk({ chainId: params.chainId });
  const provider = sdk.getProvider();

  const logs = await Promise.all(
    params.contractAddresses.map(async (contractAddress) => {
      return await provider.getLogs({
        address: contractAddress,
        fromBlock: ethers.utils.hexlify(params.fromBlock),
        toBlock: ethers.utils.hexlify(params.toBlock),
      });
    }),
  );
  return logs.flat();
};

// Worker
let _worker: Worker | null = null;
if (redis) {
  _worker = new Worker(PROCESS_EVENT_LOGS_QUEUE_NAME, handler, {
    concurrency: 5,
    connection: redis,
  });
  logWorkerEvents(_worker);
}
