import { prisma } from "../client";
import { cleanWallet } from "../wallets/cleanWallet";

export interface GetAllWalletsParams {
  chainId: number;
}

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async ({ chainId }: GetAllWalletsParams) => {
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
