import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

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

  return await prisma.transactions.findMany({
    where: {
      fromAddress: walletAddress.toLowerCase(),
    },
    orderBy: [
      {
        queuedAt: "desc",
      },
    ],
  });
};
