import { ethers } from "ethers";
import { PrismaTransaction } from "../../schema/prisma";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";

interface UpdateTxParams {
  pgtx?: PrismaTransaction;
  queueId: string;
  data: UpdateTxData;
}

type UpdateTxData =
  | {
      status: TransactionStatusEnum.Cancelled;
    }
  | {
      status: TransactionStatusEnum.Processed;
    }
  | {
      status: TransactionStatusEnum.Errored;
      errorMessage: string;
    }
  | {
      status: TransactionStatusEnum.Submitted;
      sentAt: Date;
      transactionHash: string;
      res: ethers.providers.TransactionResponse | null;
      sentAtBlockNumber: number;
      retryCount?: number;
    }
  | {
      status: TransactionStatusEnum.UserOpSent;
      sentAt: Date;
      userOpHash: string;
    }
  | {
      status: TransactionStatusEnum.Mined;
      gasPrice?: string;
      blockNumber?: number;
      minedAt: Date;
      onChainTxStatus?: number;
      transactionHash?: string;
      transactionType?: number;
      gasLimit?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      nonce?: number;
    };

export const updateTx = async ({ pgtx, queueId, data }: UpdateTxParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  switch (data.status) {
    case TransactionStatusEnum.Cancelled:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          cancelledAt: new Date(),
        },
      });
      break;
    case TransactionStatusEnum.Processed:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          processedAt: new Date(),
        },
      });
      break;
    case TransactionStatusEnum.Errored:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          errorMessage: data.errorMessage,
        },
      });
      break;
    case TransactionStatusEnum.Submitted:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          sentAt: data.sentAt,
          transactionHash: data.transactionHash,
          sentAtBlockNumber: data.sentAtBlockNumber,
          retryCount: data.retryCount,
          nonce: data.res?.nonce,
          transactionType: data.res?.type || undefined,
          gasPrice: data.res?.gasPrice?.toString(),
          gasLimit: data.res?.gasLimit?.toString(),
          maxFeePerGas: data.res?.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: data.res?.maxPriorityFeePerGas?.toString(),
        },
      });
      break;
    case TransactionStatusEnum.UserOpSent:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          sentAt: data.sentAt,
          userOpHash: data.userOpHash,
        },
      });
      break;
    case TransactionStatusEnum.Mined:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          minedAt: data.minedAt,
          blockNumber: data.blockNumber,
          onChainTxStatus: data.onChainTxStatus,
          transactionHash: data.transactionHash,
          transactionType: data.transactionType,
          gasPrice: data.gasPrice,
          gasLimit: data.gasLimit,
          maxFeePerGas: data.maxFeePerGas,
          maxPriorityFeePerGas: data.maxPriorityFeePerGas,
          nonce: data.nonce,
        },
      });
      break;
  }
};
