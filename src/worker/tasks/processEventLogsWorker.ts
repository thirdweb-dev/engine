import { Prisma, Webhooks } from "@prisma/client";
import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import {
  PreparedEvent,
  defineChain,
  eth_getBlockByHash,
  getContract,
  getContractEvents,
  getRpcClient,
  prepareEvent,
} from "thirdweb";
import { resolveContractAbi } from "thirdweb/contract";
import { bulkInsertContractEventLogs } from "../../db/contractEventLogs/createContractEventLogs";
import { getContractSubscriptionsByChainId } from "../../db/contractSubscriptions/getContractSubscriptions";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  EnqueueProcessEventLogsData,
  PROCESS_EVENT_LOGS_QUEUE_NAME,
} from "../queues/processEventLogsQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueWebhook } from "../queues/sendWebhookQueue";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { chainId, filters, fromBlock, toBlock } =
    superjson.parse<EnqueueProcessEventLogsData>(job.data);

  const logs = await getLogs({
    chainId,
    fromBlock,
    toBlock,
    filters,
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

  if (insertedLogs.length === 0) {
    return;
  }

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

const getLogs = async (
  params: GetLogsParams,
): Promise<Prisma.ContractEventLogsCreateInput[]> => {
  const chain = defineChain(params.chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  // Get events for each contract address. Apply any filters.
  const promises = params.filters.map(async (f) => {
    const contract = await getContract({
      client: thirdwebClient,
      chain,
      address: f.address,
    });

    // Get events to filter by, if any.
    const events: PreparedEvent[] = [];
    if (f.events.length) {
      const abi = await resolveContractAbi(contract);
      for (const event of f.events) {
        const signature = abi.find((a) => a.name === event);
        if (signature) {
          events.push(prepareEvent({ signature }));
        }
      }
    }

    // TODO: add filter for function name.

    return await getContractEvents({
      contract,
      fromBlock: BigInt(params.fromBlock),
      toBlock: BigInt(params.toBlock),
      events,
    });
  });
  // Query and flatten all events.
  const allEvents = (await Promise.all(promises)).flat();

  // Transform logs into the DB schema.
  const formattedLogs: Prisma.ContractEventLogsCreateInput[] = [];
  for (const event of allEvents) {
    // This makes an RPC call, but it should be cached in SDK when querying the same block hash.
    const timestamp = await getBlockTimestamp(rpcRequest, event.blockHash);

    formattedLogs.push({
      chainId: params.chainId,
      blockNumber: Number(event.blockNumber),
      contractAddress: event.address.toLowerCase(),
      transactionHash: event.transactionHash,
      topic0: event.topics[0],
      topic1: event.topics[1],
      topic2: event.topics[2],
      topic3: event.topics[3],
      data: event.data,
      eventName: event.eventName,
      decodedLog: event.args,
      timestamp,
      transactionIndex: event.transactionIndex,
      logIndex: event.logIndex,
    });
  }

  return formattedLogs;
};

const getBlockTimestamp = async (
  rpcRequest: ReturnType<typeof getRpcClient>,
  blockHash: `0x${string}`,
): Promise<Date> => {
  try {
    const block = await eth_getBlockByHash(rpcRequest, { blockHash });
    return new Date(block.timestamp * 1000n);
  } catch (e) {
    return new Date();
  }
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
