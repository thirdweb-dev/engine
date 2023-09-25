import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetAllWalletsParams {
  pgtx?: PrismaTransaction;
}

// TODO: Add error logging handler from req.log to all queries
export const getAllWallets = async ({ pgtx }: GetAllWalletsParams = {}) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const wallets = await prisma.walletDetails.findMany();
  return wallets;
};
