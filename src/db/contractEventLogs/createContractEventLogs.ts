import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

export interface ContractEventLogEntry {
  chainId: number;
  blockNumber: number;
  contractAddress: string;
  transactionHash: string;
  topic0?: string;
  topic1?: string;
  topic2?: string;
  topic3?: string;
  data: string;
  decodedLog?: any; // Assuming JSON object for decodedLog
  eventName?: string;
  timestamp: Date;
  transactionIndex: number;
  logIndex: number;
}

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  logs: ContractEventLogEntry[];
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
