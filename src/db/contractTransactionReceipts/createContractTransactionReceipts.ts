import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface ContractTransactionReceiptEntry {
  chainId: number;
  blockNumber: number;
  contractId: string;
  contractAddress: string;
  transactionHash: string;
  blockHash: string;
  timestamp: Date;
  to: string;
  from: string;
  transactionIndex: number;
  value: string;
  data: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: number;
}

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  txReceipts: ContractTransactionReceiptEntry[];
}

export const bulkInsertContractTransactionReceipts = async ({
  pgtx,
  txReceipts,
}: BulkInsertContractLogsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractTransactionReceipts.createMany({
    data: txReceipts,
    skipDuplicates: true,
  });
};
