import { v4 as uuid } from "uuid";
import { TransactionStatus } from "../../server/schemas/transaction";
import { simulateTx } from "../../server/utils/simulateTx";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";
import { sendWebhooks } from "../../utils/webhook";
import { getWalletDetails } from "../wallets/getWalletDetails";
import { redis } from "../../utils/redis/redis";
import {
  AATransaction,
  DeployTransaction,
  EOATransaction,
  TX_QUEUE_PENDING,
  Transaction,
  TxQueue,
  TxQueueStatus,
} from "../../constants/queue";
import { logger } from "../../utils/logger";

export const queueTxRaw = async (
  tx: EOATransaction | AATransaction | DeployTransaction,
  simulateTx: boolean = false,
): Promise<TxQueue> => {
  let walletDetails;

  if ("fromAddress" in tx) {
    walletDetails = await getWalletDetails({
      address: tx.fromAddress,
    });
  } else if ("signerAddress" in tx) {
    walletDetails = await getWalletDetails({
      address: tx.signerAddress,
    });
  } else {
    throw new Error("Invalid transaction missing fromAddress or signerAddress");
  }

  logger({
    level: "debug",
    message: `QeuueRawTx transaction for chain ${tx.chainId}`,
    service: "server",
  });

  if (!walletDetails) {
    throw new Error(`No backend wallet found with address`);
  }

  if (simulateTx && false) {
    await simulateTx({ txRaw: tx });
  }

  const id = uuid();
  const insertData: TxQueue = {
    txn: tx,
    id,
    pendingAt: new Date(),
    status: TxQueueStatus.Pending,
  };

  //let txRow: Transactions;
  //TODO add idempotency key functionality back in
  /*  if (idempotencyKey) {*/
  /*// Upsert the tx (insert if not exists).*/
  /*txRow = await prisma.transactions.upsert({*/
  /*where: { idempotencyKey },*/
  /*create: {*/
  /*...insertData,*/
  /*idempotencyKey,*/
  /*},*/
  /*update: {},*/
  /*});*/
  /*} else {*/
  // Insert the tx.
  redis.hset(
    insertData.id,
    "status",
    insertData.status,
    "txn",
    JSON.stringify(insertData.txn),
    "pendingAt",
    insertData.pendingAt.toISOString(),
  );
  redis.rpush(TX_QUEUE_PENDING, insertData.id);
  //}

  // Send queued webhook.
  sendWebhooks([
    {
      queueId: insertData.id,
      status: TransactionStatus.Queued,
    },
  ]).catch((err) => {
    console.error("Error sending webhooks", err);
  });

  /*  reportUsage([*/
  /*{*/
  /*input: {*/
  /*chainId: tx.chainId || undefined,*/
  /*fromAddress: tx.fromAddress || undefined,*/
  /*toAddress: tx.toAddress || undefined,*/
  /*value: tx.value || undefined,*/
  /*transactionHash: tx.transactionHash || undefined,*/
  /*functionName: tx.functionName || undefined,*/
  /*extension: tx.extension || undefined,*/
  /*},*/
  /*action: UsageEventTxActionEnum.QueueTx,*/
  /*},*/
  /*]);*/

  return insertData;
};
