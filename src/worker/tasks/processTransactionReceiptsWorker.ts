import { Prisma } from "@prisma/client";
import { Job, Processor, Worker } from "bullmq";
import superjson from "superjson";
import {
  defineChain,
  eth_getBlockByNumber,
  eth_getTransactionReceipt,
  getRpcClient,
} from "thirdweb";
import { TransactionReceipt } from "thirdweb/transaction";
import {
  Block,
  FormattedTransaction,
  Hash,
  Transaction,
  decodeFunctionData,
} from "viem";
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

const getTransactionsAndReceipts = async ({
  chainId,
  fromBlock,
  toBlock,
  filters,
}: EnqueueProcessTransactionReceiptsData): Promise<
  {
    block: Block;
    transactions: Record<Hash, FormattedTransaction>;
    receipts: Record<Hash, TransactionReceipt>;
  }[]
> => {
  if (filters.length === 0) {
    return [];
  }

  const rpcRequest = getRpcClient({
    client: thirdwebClient,
    chain: defineChain(chainId),
  });

  // Get array of block numbers between `fromBlock` and `toBlock` inclusive.
  const blockRange: bigint[] = [];
  for (let i = fromBlock; i <= toBlock; i++) {
    blockRange.push(BigInt(i));
  }

  // Get map of { k: address => v: function names to filter, if any }.
  const addressFilters: Record<string, string[]> = {};
  for (const filter of filters) {
    addressFilters[filter.address] = filter.functions;
  }

  const getMatchedTransactionsFromBlock = async (
    blockNumber: bigint,
  ): Promise<{
    block: Block;
    transactions: Record<Hash, FormattedTransaction>;
    receipts: Record<Hash, TransactionReceipt>;
  }> => {
    const block = await eth_getBlockByNumber(rpcRequest, {
      blockNumber,
      includeTransactions: true,
    });

    const transactions: Record<Hash, Transaction> = {};
    const receipts: Record<Hash, TransactionReceipt> = {};

    for (const transaction of block.transactions) {
      const toAddress = transaction.to?.toLowerCase();
      if (!toAddress || !(toAddress in addressFilters)) {
        // This transaction is not to a subscribed address.
        continue;
      }

      const filterFunctions = new Set(addressFilters[toAddress]);
      if (filterFunctions.size > 0) {
        const { functionName } = decodeFunctionData({
          // TODO: get abi from contract
          abi,
          data: transaction.input,
        });
        if (!filterFunctions.has(functionName)) {
          // This transaction is to a subscribed address but not a subscribed function name.
          continue;
        }
      }

      // Store the transaction and receipt.
      transactions[transaction.hash] = transaction;
      receipts[transaction.hash] = await eth_getTransactionReceipt(rpcRequest, {
        hash: transaction.hash,
      });
    }

    return { block, transactions, receipts };
  };

  return await Promise.all(
    blockRange.map((blockNumber) =>
      getMatchedTransactionsFromBlock(blockNumber),
    ),
  );
};

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { chainId, filters, fromBlock, toBlock } =
    superjson.parse<EnqueueProcessTransactionReceiptsData>(job.data);

  const results = await getTransactionsAndReceipts({
    chainId,
    fromBlock,
    toBlock,
    filters,
  });

  const receipts: Prisma.ContractTransactionReceiptsCreateInput[] = [];
  for (const { block, transactions, receipts: _receipts } of results) {
    for (const [hash, transaction] of Object.entries(transactions)) {
      const receipt = _receipts[hash as Hash];
      if (!receipt.to) {
        continue;
      }

      receipts.push({
        chainId,
        blockNumber: Number(receipt.blockNumber),
        contractAddress: receipt.to.toLowerCase(),
        contractId: getContractId(chainId, receipt.to.toLowerCase()),
        blockHash: receipt.blockHash.toLowerCase(),
        transactionHash: receipt.transactionHash.toLowerCase(),
        timestamp: new Date(Number(block.timestamp) * 1000),
        to: receipt.to.toLowerCase(),
        from: receipt.from.toLowerCase(),
        value: transaction.value.toString(),
        data: transaction.input,
        transactionIndex: receipt.transactionIndex,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status ? 1 : 0,
      });
    }
  }

  if (receipts.length === 0) {
    return;
  }

  // Get webhooks.
  const webhooksByContractAddress = await getWebhooksByContractAddresses(
    chainId,
  );

  // Store logs to DB.
  const insertedReceipts = await bulkInsertContractTransactionReceipts({
    receipts,
  });

  if (insertedReceipts.length === 0) {
    return;
  }

  // Enqueue webhooks.
  // This step should happen immediately after inserting to DB.
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

// Worker
let _worker: Worker | null = null;
if (redis) {
  _worker = new Worker(PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME, handler, {
    concurrency: 5,
    connection: redis,
  });
  logWorkerEvents(_worker);
}
