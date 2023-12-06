import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetAllWalletsParams {
  pgtx?: PrismaTransaction;
  page: number;
  limit: number;
}

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async ({
  pgtx,
  page,
  limit,
}: GetAllWalletsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.walletDetails.findMany({
    skip: (page - 1) * limit,
    take: limit,
  });
};
