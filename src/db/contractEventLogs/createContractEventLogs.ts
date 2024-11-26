import type { ContractEventLogs, Prisma } from "@prisma/client";
import type { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  logs: Prisma.ContractEventLogsCreateInput[];
}

export const bulkInsertContractEventLogs = async ({
  pgtx,
  logs,
}: BulkInsertContractLogsParams): Promise<ContractEventLogs[]> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractEventLogs.createManyAndReturn({
    data: logs,
    skipDuplicates: true,
  });
};
