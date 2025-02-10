import type { Prisma, Webhooks } from "@prisma/client";
import type { AbiEvent } from "abitype";
import { Worker, type Job, type Processor } from "bullmq";
import superjson from "superjson";
import {
  eth_getBlockByHash,
  getContract,
  getContractEvents,
  getRpcClient,
  prepareEvent,
  type Address,
  type Chain,
  type Hex,
  type PreparedEvent,
  type ThirdwebContract,
} from "thirdweb";
import { resolveContractAbi } from "thirdweb/contract";
import { bulkInsertContractEventLogs } from "../../shared/db/contract-event-logs/create-contract-event-logs.js";
import { getContractSubscriptionsByChainId } from "../../shared/db/contract-subscriptions/get-contract-subscriptions.js";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks.js";
import { getChain } from "../../shared/utils/chain.js";
import { logger } from "../../shared/utils/logger.js";
import { normalizeAddress } from "../../shared/utils/primitive-types.js";
import { redis } from "../../shared/utils/redis/redis.js";
import { thirdwebClient } from "../../shared/utils/sdk.js";
import {
  type EnqueueProcessEventLogsData,
  ProcessEventsLogQueue,
} from "../queues/process-event-logs-queue.js";
import { logWorkerExceptions } from "../queues/queues.js";
import { SendWebhookQueue } from "../queues/send-webhook-queue.js";

const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const {
    chainId,
    filters = [],
    fromBlock,
    toBlock,
  } = superjson.parse<EnqueueProcessEventLogsData>(job.data);

  const logs = await getLogs({
    chainId,
    fromBlock,
    toBlock,
    filters,
  });
  if (logs.length === 0) {
    return;
  }

  // Store logs to DB.
  const insertedLogs = await bulkInsertContractEventLogs({ logs });
  if (insertedLogs.length === 0) {
    return;
  }
  job.log(`Inserted ${insertedLogs.length} events.`);

  // Enqueue webhooks.
  const webhooksByContractAddress = await getWebhooksByContractAddresses(
    chainId,
  );
  for (const eventLog of insertedLogs) {
    const webhooks = webhooksByContractAddress[eventLog.contractAddress] ?? [];
    for (const webhook of webhooks) {
      await SendWebhookQueue.enqueueWebhook({
        type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION,
        webhook,
        eventLog,
      });
    }
  }

  // Any logs inserted in a delayed job indicates missed logs in the realtime job.
  if (job.opts.delay && job.opts.delay > 0) {
    logger({
      service: "worker",
      level: "warn",
      message: `Found ${
        insertedLogs.length
      } logs on chain: ${chainId}, block: ${insertedLogs.map(
        (log) => log.blockNumber,
      )}  after ${job.opts.delay / 1000}s.`,
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

type GetLogsParams = EnqueueProcessEventLogsData;

/**
 * Gets all event logs for the subscribed addresses and filters.
 * @returns A list of logs to insert to the ContractEventLogs table.
 */
const getLogs = async ({
  chainId,
  fromBlock,
  toBlock,
  filters,
}: GetLogsParams): Promise<Prisma.ContractEventLogsCreateInput[]> => {
  if (filters.length === 0) {
    return [];
  }

  const chain = await getChain(chainId);
  // Store a reference to `contract` so ABI fetches are cached.
  const addressConfig: Record<
    Address,
    {
      contract: ThirdwebContract;
    }
  > = {};
  for (const filter of filters) {
    addressConfig[filter.address] = {
      contract: getContract({
        client: thirdwebClient,
        chain,
        address: filter.address,
      }),
    };
  }

  // Get events for each contract address. Apply any filters.
  const promises = filters.map(async (f) => {
    const addressConfigAddress = addressConfig[f.address];
    if (!addressConfigAddress) {
      return [];
    }

    const contract = addressConfigAddress.contract;

    // Get events to filter by, if any.
    // Resolve the event name, "Transfer", to event signature, "Transfer(address to, uint256 quantity)".
    const events: PreparedEvent<AbiEvent>[] = [];
    if (f.events.length > 0) {
      const abi = await resolveContractAbi<AbiEvent[]>(contract);
      for (const signature of abi) {
        if (f.events.includes(signature.name)) {
          events.push(prepareEvent({ signature }));
        }
      }
    }

    return await getContractEvents({
      contract,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
      events, // [] means return all events
    });
  });

  // Query and flatten all events.
  const allLogs = (await Promise.all(promises)).flat();

  // Get timestamps for blocks.
  const blockHashes = allLogs.map((e) => e.blockHash);
  const blockTimestamps = await getBlockTimestamps(chain, blockHashes);

  // Transform logs into the DB schema.
  return await Promise.all(
    allLogs.map(async (log): Promise<Prisma.ContractEventLogsCreateInput> => {
      const timestamp = blockTimestamps[log.blockHash];
      if (!timestamp) {
        throw new Error(`Missing timestamp for block hash ${log.blockHash}`);
      }

      const addressConfigAddress = addressConfig[normalizeAddress(log.address)];

      if (!addressConfigAddress) {
        throw new Error(`Missing address config for address ${log.address}`);
      }

      return {
        chainId: chainId.toString(),
        blockNumber: Number(log.blockNumber),
        contractAddress: normalizeAddress(log.address),
        transactionHash: log.transactionHash,
        topic0: log.topics[0],
        topic1: log.topics[1],
        topic2: log.topics[2],
        topic3: log.topics[3],
        data: log.data,
        eventName: log.eventName,
        decodedLog: await formatDecodedLog({
          contract: addressConfigAddress.contract,
          eventName: log.eventName,
          logArgs: log.args as Record<string, unknown>,
        }),
        timestamp,
        transactionIndex: log.transactionIndex,
        logIndex: log.logIndex,
      };
    }),
  );
};

/**
 * Transform v5 SDK to v4 log format.
 *
 * Example input:
 *    {
 *      "to": "0x123...",
 *      "quantity": 2n
 *    }
 *
 * Example output:
 *    {
 *      "to": {
 *        "type:" "address",
 *        "value": "0x123..."
 *      },
 *      "quantity": {
 *        "type:" "uint256",
 *        "value": "2"
 *      }
 *    }
 */
const formatDecodedLog = async (args: {
  contract: ThirdwebContract;
  eventName: string;
  logArgs: Record<string, unknown>;
}): Promise<Record<string, Prisma.InputJsonObject> | undefined> => {
  const { contract, eventName, logArgs } = args;

  const abi = await resolveContractAbi<AbiEvent[]>(contract);
  const eventSignature = abi.find((a) => a.name === eventName);
  if (!eventSignature) {
    return;
  }

  const res: Record<string, Prisma.InputJsonObject> = {};
  for (const { name, type } of eventSignature.inputs) {
    if (name && name in logArgs) {
      res[name] = {
        type,
        value: logArgToString(logArgs[name]),
      };
    }
  }
  return res;
};

/**
 * Gets the timestamps for a list of block hashes. Falls back to the current time.
 * @param chain
 * @param blockHashes
 * @returns Record<Hex, Date>
 */
const getBlockTimestamps = async (
  chain: Chain,
  blockHashes: Hex[],
): Promise<Record<Hex, Date>> => {
  const now = new Date();
  const dedupe = Array.from(new Set(blockHashes));
  const rpcRequest = getRpcClient({ client: thirdwebClient, chain });

  const blocks = await Promise.all(
    dedupe.map(async (blockHash) => {
      try {
        const block = await eth_getBlockByHash(rpcRequest, { blockHash });
        return new Date(Number(block.timestamp) * 1000);
      } catch (_e) {
        return now;
      }
    }),
  );

  const res: Record<Hex, Date> = {};

  for (const [dedupedHashIndex, dedupedHash] of dedupe.entries()) {
    const timestamp = blocks[dedupedHashIndex];
    if (!timestamp) {
      continue;
    }

    res[dedupedHash] = timestamp;
  }

  return res;
};

const logArgToString = (arg: unknown): string => {
  if (arg === null) {
    return "";
  }
  if (typeof arg === "object") {
    return Object.values(arg).map(logArgToString).join(",");
  }
  if (Array.isArray(arg)) {
    return arg.map(logArgToString).join(",");
  }
  return String(arg);
};

// Must be explicitly called for the worker to run on this host.
export const initProcessEventLogsWorker = () => {
  const _worker = new Worker(ProcessEventsLogQueue.q.name, handler, {
    concurrency: 5,
    connection: redis,
  });
  logWorkerExceptions(_worker);
};
