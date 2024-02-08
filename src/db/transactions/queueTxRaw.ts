import type { Prisma } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { getWalletDetails } from "../wallets/getWalletDetails";
import { simulateTx } from "../../server/utils/simulateTx";

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
      `No backend wallet found with address ${tx.fromAddress || tx.signerAddress
      }`,
    );
  }

  if (shouldSimulate) {
    await simulateTx({ txRaw: tx })
  }

  return prisma.transactions.create({
    data: {
      ...tx,
      fromAddress: tx.fromAddress?.toLowerCase(),
      toAddress: tx.toAddress?.toLowerCase(),
      target: tx.target?.toLowerCase(),
      signerAddress: tx.signerAddress?.toLowerCase(),
      accountAddress: tx.accountAddress?.toLowerCase(),
    },
  });
};
