import { prisma } from "../client";

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

export const bulkInsertContractLogs = async (logs: ContractLogEntry[]) => {
  return await prisma.contractLogs.createMany({
    data: logs,
    skipDuplicates: true,
  });
};
