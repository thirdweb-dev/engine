import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

export interface ContractLogEntry {
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
  logs: ContractLogEntry[];
}

export const bulkInsertContractLogs = async ({
  pgtx,
  logs,
}: BulkInsertContractLogsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractLogs.createMany({
    data: logs,
    skipDuplicates: true,
  });
};
