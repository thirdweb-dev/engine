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

  gasUsed: string;
  effectiveGasPrice: string;
  status: number;
}

export interface BulkInsertContractLogsParams {
  pgtx?: PrismaTransaction;
  receipts: ContractTransactionReceiptEntry[];
}

export const bulkInsertContractTransactionReceipts = async ({
  pgtx,
  receipts,
}: BulkInsertContractLogsParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  return await prisma.contractTransactionReceipts.createMany({
    data: receipts,
    skipDuplicates: true,
  });
};
