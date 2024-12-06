import { ContractTransactionReceipts, Prisma } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
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
