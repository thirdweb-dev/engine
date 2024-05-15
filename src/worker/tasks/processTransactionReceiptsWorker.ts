import { BlockWithTransactions } from "@ethersproject/abstract-provider";
import { Prisma } from "@prisma/client";
import { Job, Processor, Worker } from "bullmq";
import { ethers } from "ethers";
import superjson from "superjson";
import { bulkInsertContractTransactionReceipts } from "../../db/contractTransactionReceipts/createContractTransactionReceipts";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { redis } from "../../utils/redis/redis";
import {
  EnqueueProcessTransactionReceiptsData,
  PROCESS_TRANSACTION_RECEIPTS_QUEUE_NAME,
} from "../queues/processTransactionReceiptsQueue";
import { logWorkerEvents } from "../queues/queues";
import { enqueueWebhook } from "../queues/sendWebhookQueue";
import { getContractId } from "../utils/contractId";
import { getWebhooksByContractAddresses } from "./processEventLogsWorker";

interface GetBlocksAndTransactionsParams {
  chainId: number;
  contractAddresses: string[];
  fromBlock: number;
  toBlock: number;
}

const getBlocksAndTransactions = async ({
  chainId,
  fromBlock,
  toBlock,
  contractAddresses,
}: GetBlocksAndTransactionsParams) => {
  const sdk = await getSdk({ chainId: chainId });
  const provider = sdk.getProvider();

  const blockNumbers = Array.from(
    { length: toBlock - fromBlock + 1 },
    (_, index) => fromBlock + index,
  );

  const blocksWithTransactionsAndReceipts = await Promise.all(
    blockNumbers.map(async (blockNumber) => {
      const block = await provider.getBlockWithTransactions(blockNumber);
      let blockTransactionsWithReceipt = [];
      blockTransactionsWithReceipt = await Promise.all(
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

const handler: Processor<any, void, string> = async (job: Job<string>) => {
  const { chainId, contractAddresses, fromBlock, toBlock } =
    superjson.parse<EnqueueProcessTransactionReceiptsData>(job.data);

  const { blocks, transactionsWithReceipt } = await getBlocksAndTransactions({
    chainId,
    fromBlock,
    toBlock,
    contractAddresses,
  });

  const blockLookup = blocks.reduce((acc, curr) => {
    acc[curr.number] = curr;
    return acc;
  }, {} as Record<number, BlockWithTransactions>);

  const receipts = transactionsWithReceipt.map(
    ({
      receipt,
      transaction,
    }): Prisma.ContractTransactionReceiptsCreateInput => {
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
    },
  );
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
