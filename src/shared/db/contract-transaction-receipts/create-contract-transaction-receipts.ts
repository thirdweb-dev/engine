import type { ContractTransactionReceipts, Prisma } from "@prisma/client";
import type { PrismaTransaction } from "../../schemas/prisma";
import { getPrismaWithPostgresTx } from "../client";

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  receipts: Prisma.ContractTransactionReceiptsCreateInput[];
}

export const bulkInsertContractTransactionReceipts = async ({
  pgtx,
  receipts,
}: BulkInsertContractLogsParams): Promise<ContractTransactionReceipts[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractTransactionReceipts.createManyAndReturn({
    data: receipts,
    skipDuplicates: true,
  });
};
