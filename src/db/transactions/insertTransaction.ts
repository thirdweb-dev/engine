import { randomUUID } from "crypto";
import { Address } from "thirdweb";
import { Hex } from "viem";
import { TransactionStatus } from "../../server/schemas/transaction";
import { getAccount } from "../../utils/account";
import { enqueueTransactionWebhooks } from "../../utils/webhook";
import {
  QueuedTransaction,
  enqueuePrepareTransaction,
} from "../../worker/queues/prepareTransactionQueue";

export interface InsertedTransaction {
  chainId: number;
  from: Address;
  to?: Address;
  data: Hex;
  value?: bigint;

  gas?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;

  // Offchain metadata
  functionName?: string;
  functionArgs?: any[];
  deployedContractAddress?: string;
  deployedContractType?: string;
  extension?: string;
}

interface InsertTransactionData {
  insertedTransaction: InsertedTransaction;
  idempotencyKey?: string;
  shouldSimulate?: boolean;
}

export const insertTransaction = async (
  args: InsertTransactionData,
): Promise<QueuedTransaction> => {
  const { insertedTransaction, idempotencyKey, shouldSimulate = false } = args;
  const {
    chainId,
    from,
    to,
    functionName,
    functionArgs,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    deployedContractAddress,
    deployedContractType,
    extension,
  } = insertedTransaction;

  // Validate required params.

  const account = await getAccount({ chainId, from });
  if (!account) {
    throw new Error(`No backend wallet found: ${from}`);
  }

  if (shouldSimulate) {
    // @TODO: fix simulate
    // await simulateTx({ txRaw: tx });
  }

  const queueId = randomUUID();
  // Enqueue the transaction to be prepared.
  const queuedTransaction: QueuedTransaction = {
    queueId: queueId,
    idempotencyKey: idempotencyKey ?? queueId,
    queuedAt: new Date(),

    chainId,
    from: from.toLowerCase() as Address,
    to: to?.toLowerCase() as Address | undefined,
    data,
    gas,
    value: value ?? 0n,

    functionName,
    functionArgs,
    deployedContractAddress,
    deployedContractType,
    extension,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
  await enqueuePrepareTransaction({ queuedTransaction });

  // Handle webhooks + usage.
  await enqueueTransactionWebhooks([
    { queueId, status: TransactionStatus.Queued },
  ]);
  // @TODO: bring back usage
  // reportUsage([
  //   {
  //     input: {
  //       chainId: tx.chainId || undefined,
  //       fromAddress: tx.fromAddress || undefined,
  //       toAddress: tx.toAddress || undefined,
  //       value: tx.value || undefined,
  //       transactionHash: tx.transactionHash || undefined,
  //       functionName: tx.functionName || undefined,
  //       extension: tx.extension || undefined,
  //     },
  //     action: UsageEventTxActionEnum.QueueTx,
  //   },
  // ]);

  return queuedTransaction;
};
