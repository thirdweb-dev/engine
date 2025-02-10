import type { ContractEventLogs, Prisma } from "@prisma/client";
import type { PrismaTransaction } from "../../schemas/prisma.js";
import { getPrismaWithPostgresTx } from "../client.js";

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
