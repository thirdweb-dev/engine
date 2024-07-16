import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetWalletDetailsParams {
  pgtx?: PrismaTransaction;
  address: string;
}

export const getWalletDetails = async ({
  pgtx,
  address,
}: GetWalletDetailsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return prisma.walletDetails.findUnique({
    where: {
      address: address.toLowerCase(),
    },
  });
};
