import type { Prisma, Transactions } from "@prisma/client";
import { uuid } from "uuidv4";
import { PrismaTransaction } from "../../schema/prisma";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { simulateTx } from "../../server/utils/simulateTx";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";
import { sendWebhooks } from "../../utils/webhook";
import { getPrismaWithPostgresTx } from "../client";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = Omit<
  Prisma.TransactionsCreateInput,
  "fromAddress" | "signerAddress"
> &
  (
    | {
        fromAddress: string;
        signerAddress?: never;
      }
    | {
        fromAddress?: never;
        signerAddress: string;
      }
  ) & {
    pgtx?: PrismaTransaction;
    simulateTx?: boolean;
    idempotencyKey?: string;
  };

export const queueTxRaw = async ({
  pgtx,
  simulateTx: shouldSimulate,
  idempotencyKey,
  ...tx
}: QueueTxRawParams): Promise<Transactions> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const walletDetails = await getWalletDetails({
    pgtx,
    address: (tx.fromAddress || tx.signerAddress) as string,
  });

  if (!walletDetails) {
    throw new Error(
      `No backend wallet found with address ${
        tx.fromAddress || tx.signerAddress
      }`,
    );
  }

  if (shouldSimulate) {
    await simulateTx({ txRaw: tx });
  }

  const insertData = {
    ...tx,
    id: uuid(),
    fromAddress: tx.fromAddress?.toLowerCase(),
    toAddress: tx.toAddress?.toLowerCase(),
    target: tx.target?.toLowerCase(),
    signerAddress: tx.signerAddress?.toLowerCase(),
    accountAddress: tx.accountAddress?.toLowerCase(),
  };

  let txRow: Transactions;
  if (idempotencyKey) {
    // Upsert the tx (insert if not exists).
    txRow = await prisma.transactions.upsert({
      where: { idempotencyKey },
      create: {
        ...insertData,
        idempotencyKey,
      },
      update: {},
    });
  } else {
    // Insert the tx.
    txRow = await prisma.transactions.create({
      data: {
        ...insertData,
        // Use queueId to ensure uniqueness.
        idempotencyKey: insertData.id,
      },
    });
  }

  // Send queued webhook.
  sendWebhooks([
    {
      queueId: txRow.id,
      status: TransactionStatusEnum.Queued,
    },
  ]).catch((err) => {});

  reportUsage([
    {
      input: {
        chainId: tx.chainId || undefined,
        fromAddress: tx.fromAddress || undefined,
        toAddress: tx.toAddress || undefined,
        value: tx.value || undefined,
        transactionHash: tx.transactionHash || undefined,
        functionName: tx.functionName || undefined,
        extension: tx.extension || undefined,
      },
      action: UsageEventTxActionEnum.QueueTx,
    },
  ]);

  return txRow;
};
