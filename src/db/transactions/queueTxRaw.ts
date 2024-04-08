import { randomUUID } from "crypto";
import { InputTransaction, QueuedTransaction } from "../../schema/transaction";
import { simulate } from "../../server/utils/simulateTx";
import { UsageEventType, reportUsage } from "../../utils/usage";
import { QueuedTransactionQueue } from "../../worker/queues/queues";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = {
  tx: InputTransaction;
  simulateTx?: boolean;
};

/**
 * Enqueues a transaction.
 * @returns string The queueId generated for this transaction.
 */
export const queueTxRaw = async ({
  tx,
  simulateTx,
}: QueueTxRawParams): Promise<string> => {
  // Assert a valid backend wallet address.
  const walletAddress = tx.fromAddress || tx.signerAddress;
  if (!walletAddress) {
    throw new Error("Transaction missing sender address.");
  }
  const walletDetails = await getWalletDetails({
    address: walletAddress,
  });
  if (!walletDetails) {
    throw new Error(`Backend wallet not found: ${walletAddress}`);
  }

  // Build a QueuedTransaction.
  const queueId = randomUUID();
  const queuedTransaction: QueuedTransaction = {
    ...tx,
    id: queueId,
    idempotencyKey: tx.idempotencyKey ?? queueId,
    queuedAt: new Date(),
    value: tx.value ? BigInt(tx.value) : 0n,
  };

  // (Optional) Simulate the transaction.
  if (simulateTx) {
    await simulate({ txRaw: queuedTransaction });
  }

  // Enqueue the job.
  const job = { queuedTransaction };
  await QueuedTransactionQueue.add(job);

  reportUsage([{ action: UsageEventType.QueueTx, data: queuedTransaction }]);
  return queueId;
};
