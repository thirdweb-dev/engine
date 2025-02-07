import { getPrismaWithPostgresTx } from "../client";
import type { PrismaTransaction } from "../../schemas/prisma";

interface GetAllWalletCredentialsParams {
  pgtx?: PrismaTransaction;
  page?: number;
  limit?: number;
}

export const getAllWalletCredentials = async ({
  page = 1,
  limit = 10,
}: GetAllWalletCredentialsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const credentials = await prisma.walletCredentials.findMany({
    where: {
      deletedAt: null,
    },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      type: true,
      label: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return credentials;
}; 