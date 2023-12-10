import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { cleanTxs } from "./cleanTxs";

interface GetAllTxsByWalletParams {
  pgtx?: PrismaTransaction;
  walletAddress: string;
  chainId: number;
}

export const getAllTxsByWallet = async ({
  pgtx,
  walletAddress,
}: GetAllTxsByWalletParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const txs = await prisma.transactions.findMany({
    where: {
      fromAddress: walletAddress.toLowerCase(),
    },
    orderBy: [
      {
        queuedAt: "desc",
      },
    ],
  });

  return cleanTxs(txs);
};
