import { getPrismaWithPostgresTx, knex } from "../client";

interface GetWalletDetailsParams {
  address: string;
}

export const getWalletDetails = async ({ address }: GetWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx();
  return prisma.walletDetails.findUnique({
    where: {
      address: address.toLowerCase(),
    },
  });
};
