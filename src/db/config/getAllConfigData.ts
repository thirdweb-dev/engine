import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface GetAllConfigParams {
  pgtx?: PrismaTransaction;
}

export const getAllConfigData = async ({ pgtx }: GetAllConfigParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.configuration.findMany({});
};
