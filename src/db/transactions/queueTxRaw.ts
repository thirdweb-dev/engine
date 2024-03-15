import type { Prisma } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { simulateTx } from "../../server/utils/simulateTx";
import { reportUsage, UsageEventTxActionEnum } from "../../utils/usage";
import { sendWebhooks } from "../../utils/webhook";
import { getPrismaWithPostgresTx } from "../client";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = Omit<
  Prisma.TransactionsCreateInput,
  "fromAddress" | "signerAddress"
> & {
  pgtx?: PrismaTransaction;
  simulateTx?: boolean;
} & (
    | {
        fromAddress: string;
        signerAddress?: never;
      }
    | {
        fromAddress?: never;
        signerAddress: string;
      }
  );

export const queueTxRaw = async ({
  simulateTx: shouldSimulate,
  pgtx,
  ...tx
}: QueueTxRawParams) => {
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

  const insertedData = await prisma.transactions.create({
    data: {
      ...tx,
      fromAddress: tx.fromAddress?.toLowerCase(),
      toAddress: tx.toAddress?.toLowerCase(),
      target: tx.target?.toLowerCase(),
      signerAddress: tx.signerAddress?.toLowerCase(),
      accountAddress: tx.accountAddress?.toLowerCase(),
    },
  });

  // Send queued webhook.
  sendWebhooks([
    {
      queueId: insertedData.id,
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

  return insertedData;
};
