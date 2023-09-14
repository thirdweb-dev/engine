import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { cleanWallet } from "../wallets/cleanWallet";

interface GetAllWalletsParams {
  pgtx?: PrismaTransaction;
}

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async ({ pgtx }: GetAllWalletsParams = {}) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const wallets = await prisma.walletDetails.findMany();
  return wallets;
};

interface GetAllWalletsByChainIdParams {
  pgtx: PrismaTransaction;
  chainId: number;
}

// TODO: Change to chainId
export const getAllWalletsByChain = async ({
  pgtx,
  chainId,
}: GetAllWalletsByChainIdParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const wallets = await prisma.walletNonce.findMany({
    where: {
      chainId,
    },
    include: {
      walletDetails: true,
    },
  });

  return wallets.map((wallet) => cleanWallet(wallet));
};
