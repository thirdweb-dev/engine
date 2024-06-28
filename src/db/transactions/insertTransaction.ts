import { randomUUID } from "crypto";
import { Address } from "thirdweb";
import {
  InsertedTransaction,
  QueuedTransaction,
} from "../../server/utils/transaction";
import { getAccount } from "../../utils/account";
import { reportUsage } from "../../utils/usage";
import { enqueuePrepareTransaction } from "../../worker/queues/prepareTransactionQueue";

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

  reportUsage([{ action: "queue_tx", input: queuedTransaction }]);

  return queuedTransaction;
};
