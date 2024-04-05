import { randomUUID } from "crypto";
import { InputTransaction, QueuedTransaction } from "../../schema/transaction";
import { simulate } from "../../server/utils/simulateTx";
import { UsageEventType, reportUsage } from "../../utils/usage";
import { IngestQueue } from "../../worker/queues/queues";
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
  const queuedTx: QueuedTransaction = {
    ...tx,
    id: queueId,
    idempotencyKey: tx.idempotencyKey ?? queueId,
    value: tx.value ?? "0",
    queuedAt: new Date(),
  };

  // (Optional) Simulate the transaction.
  if (simulateTx) {
    await simulate({ txRaw: queuedTx });
  }

  // Enqueue the job.
  const job = { tx: queuedTx };
  await IngestQueue.add(job);

  reportUsage([{ action: UsageEventType.QueueTx, data: queuedTx }]);
  return queueId;
};
