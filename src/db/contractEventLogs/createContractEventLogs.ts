import { ContractEventLogs } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  logs: Omit<ContractEventLogs, "createdAt" | "updatedAt" | "decodedLog"> &
    { decodedLog?: any }[];
}

export const bulkInsertContractEventLogs = async ({
  pgtx,
  logs,
}: BulkInsertContractLogsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractEventLogs.createMany({
    data: logs,
    skipDuplicates: true,
  });
};
