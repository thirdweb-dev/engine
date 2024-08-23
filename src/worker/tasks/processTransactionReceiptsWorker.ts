import { Prisma } from "@prisma/client";
import { AbiEvent } from "abitype";
import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import {
  Address,
  ThirdwebContract,
  defineChain,
  eth_getBlockByNumber,
  eth_getTransactionReceipt,
  getContract,
  getRpcClient,
} from "thirdweb";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi, Hash, decodeFunctionData } from "viem";
import { bulkInsertContractTransactionReceipts } from "../../db/contractTransactionReceipts/createContractTransactionReceipts";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  EnqueueProcessTransactionReceiptsData,
  PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME,
} from "../queues/processTransactionReceiptsQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueWebhook } from "../queues/sendWebhookQueue";
import { getContractId } from "../utils/contractId";
import { getWebhooksByContractAddresses } from "./processEventLogsWorker";

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const {
    chainId,
    filters = [],
    fromBlock,
    toBlock,
  } = superjson.parse<EnqueueProcessTransactionReceiptsData>(job.data);

  const receipts = await getFormattedTransactionReceipts({
    chainId,
    fromBlock,
    toBlock,
    filters,
  });
  if (receipts.length === 0) {
    return;
  }

  // Store logs to DB.
  const insertedReceipts = await bulkInsertContractTransactionReceipts({
    receipts,
  });
  if (insertedReceipts.length === 0) {
    return;
  }

  // Enqueue webhooks.
  const webhooksByContractAddress = await getWebhooksByContractAddresses(
    chainId,
  );
  for (const transactionReceipt of insertedReceipts) {
    const webhooks =
      webhooksByContractAddress[transactionReceipt.contractAddress] ?? [];
    for (const webhook of webhooks) {
      await enqueueWebhook({
        type: WebhooksEventTypes.CONTRACT_SUBSCRIPTION,
        webhook,
        transactionReceipt,
      });
    }
  }

  // Any receipts inserted in a delayed job indicates missed receipts in the realtime job.
  if (job.opts.delay && job.opts.delay > 0) {
    logger({
      service: "worker",
      level: "warn",
      message: `Found ${
        insertedReceipts.length
      } receipts on chain: ${chainId}, block: ${insertedReceipts.map(
        (receipt) => receipt.blockNumber,
      )} after ${job.opts.delay / 1000}s.`,
    });
  }
};

/**
 * Gets all transaction receipts for the subscribed addresses and filters.
 * @returns A list of receipts to insert to the ContractTransactionReceipts table.
 */
const getFormattedTransactionReceipts = async ({
  chainId,
  fromBlock,
  toBlock,
  filters,
}: EnqueueProcessTransactionReceiptsData): Promise<
  Prisma.ContractTransactionReceiptsCreateInput[]
> => {
  if (filters.length === 0) {
    return [];
  }

  const chain = defineChain(chainId);
  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain,
  });

  // Get array of block numbers between `fromBlock` and `toBlock` inclusive.
  const blockRange: bigint[] = [];
  for (let i = fromBlock; i <= toBlock; i++) {
    blockRange.push(BigInt(i));
  }

  // Get the filtered functions (empty = no filter) and contract object for each address.
  const addressConfig: Record<
    Address,
    {
      functions: string[];
      contract: ThirdwebContract;
    }
  > = {};
  for (const filter of filters) {
    // Merge multiple filters for the same address.
    if (filter.address in addressConfig) {
      addressConfig[filter.address].functions.push(...filter.functions);
    }

    addressConfig[filter.address] = {
      functions: filter.functions,
      contract: getContract({
        client: thirdwebClient,
        chain,
        address: filter.address,
      }),
    };
  }

  const getFormattedTransactionReceiptsFromBlock = async (
    blockNumber: bigint,
  ): Promise<Prisma.ContractTransactionReceiptsCreateInput[]> => {
    const block = await eth_getBlockByNumber(rpcRequest, {
      blockNumber,
      includeTransactions: true,
    });

    const receipts: Prisma.ContractTransactionReceiptsCreateInput[] = [];
    for (const transaction of block.transactions) {
      const toAddress = transaction.to?.toLowerCase() as Address | undefined;
      if (!toAddress) {
        // This transaction is a contract deployment.
        continue;
      }
      const config = addressConfig[toAddress];
      if (!config) {
        // This transaction is not to a subscribed address.
        continue;
      }

      let functionName: string | undefined = undefined;
      if (config.functions.length > 0) {
        functionName = await getFunctionName({
          contract: config.contract,
          data: transaction.input,
        });

        if (!config.functions.includes(functionName)) {
          // This transaction is not for a subscribed function name.
          continue;
        }
      }

      // Store the transaction and receipt.
      const receipt = await eth_getTransactionReceipt(rpcRequest, {
        hash: transaction.hash,
      });

      receipts.push({
        chainId,
        blockNumber: Number(receipt.blockNumber),
        contractAddress: toAddress,
        contractId: getContractId(chainId, toAddress),
        blockHash: receipt.blockHash.toLowerCase(),
        transactionHash: receipt.transactionHash.toLowerCase(),
        timestamp: new Date(Number(block.timestamp) * 1000),
        to: toAddress,
        from: receipt.from.toLowerCase(),
        value: transaction.value.toString(),
        data: transaction.input,
        functionName,
        transactionIndex: receipt.transactionIndex,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString() ?? "",
        status: receipt.status === "success" ? 1 : 0,
      });
    }

    return receipts;
  };

  const allReceipts = await Promise.all(
    blockRange.map((blockNumber) =>
      getFormattedTransactionReceiptsFromBlock(blockNumber),
    ),
  );
  return allReceipts.flat();
};

const getFunctionName = async (args: {
  contract: ThirdwebContract;
  data: Hash;
}) => {
  const abi = await resolveContractAbi<AbiEvent[]>(args.contract);
  const decoded = decodeFunctionData<Abi>({
    abi,
    data: args.data,
  });
  return decoded.functionName;
};

// Worker
let _worker: Worker | null = null;
if (redis) {
  _worker = new Worker(PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME, handler, {
    concurrency: 5,
    connection: redis,
  });
  logWorkerEvents(_worker);
}
