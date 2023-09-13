import { prisma } from "../client";

export interface GetAllWalletsParams {
  chainId: number;
}

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async ({ chainId }: GetAllWalletsParams) => {
  return prisma.walletNonce.findMany({
    where: {
      chainId,
    },
    include: {
      walletDetails: true,
    },
  });
};
