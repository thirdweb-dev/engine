import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetBackendWalletParams {
  pgtx?: PrismaTransaction;
  address: string;
}

export const getBackendWallet = async ({
  pgtx,
  address,
}: GetBackendWalletParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.backendWallet.findUnique({
    where: {
      address: address.toLowerCase(),
    },
  });
};
