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
      res: ethers.providers.TransactionResponse;
      sentAtBlockNumber: number;
      retryCount?: number;
    }
  | {
      status: TransactionStatusEnum.UserOpSent;
      userOpHash: string;
    }
  | {
      status: TransactionStatusEnum.Mined;
      gasPrice?: string;
      blockNumber?: number;
      minedAt: Date;
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
          sentAt: new Date(),
          nonce: data.res.nonce,
          transactionHash: data.res.hash,
          transactionType: data.res.type || undefined,
          gasPrice: data.res.gasPrice?.toString(),
          gasLimit: data.res.gasLimit?.toString(),
          maxFeePerGas: data.res.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: data.res.maxPriorityFeePerGas?.toString(),
          sentAtBlockNumber: data.sentAtBlockNumber,
          retryCount: data.retryCount,
        },
      });
      break;
    case TransactionStatusEnum.UserOpSent:
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          sentAt: new Date(),
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
          gasPrice: data.gasPrice,
          blockNumber: data.blockNumber,
        },
      });
      break;
  }
};
