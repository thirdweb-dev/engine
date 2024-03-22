import { BigNumber, ethers } from "ethers";
import { PrismaTransaction } from "../../schema/prisma";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx, webhookQueue } from "../client";
import { cleanTxs } from "./cleanTxs";

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
      res: ethers.providers.TransactionRequest;
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
  if (data.status === TransactionStatusEnum.Cancelled) {
    const updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        cancelledAt: new Date(),
      },
    });

    const sanitizedTxData = cleanTxs([updatedData]);

    webhookQueue.add("webhookQueue", {
      id: queueId,
      data: sanitizedTxData[0],
      status: TransactionStatusEnum.Cancelled,
    });
  } else if (data.status === TransactionStatusEnum.Errored) {
    const updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        errorMessage: data.errorMessage,
      },
    });

    const sanitizedTxData = cleanTxs([updatedData]);

    webhookQueue.add("webhookQueue", {
      id: queueId,
      data: sanitizedTxData[0],
      status: TransactionStatusEnum.Errored,
    });
  } else if (data.status === TransactionStatusEnum.Submitted) {
    const updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        sentAt: data.sentAt,
        transactionHash: data.transactionHash,
        sentAtBlockNumber: data.sentAtBlockNumber,
        retryCount: data.retryCount,
        nonce: BigNumber.from(data.res.nonce).toNumber(),
        transactionType: data.res?.type || undefined,
        gasPrice: data.res?.gasPrice?.toString(),
        gasLimit: data.res?.gasLimit?.toString(),
        maxFeePerGas: data.res?.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: data.res?.maxPriorityFeePerGas?.toString(),
      },
    });

    const sanitizedTxData = cleanTxs([updatedData]);

    webhookQueue.add("webhookQueue", {
      id: queueId,
      data: sanitizedTxData[0],
      status: TransactionStatusEnum.Errored,
    });
  } else if (data.status === TransactionStatusEnum.UserOpSent) {
    const updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        sentAt: data.sentAt,
        userOpHash: data.userOpHash,
      },
    });

    const sanitizedTxData = cleanTxs([updatedData]);

    webhookQueue.add("webhookQueue", {
      id: queueId,
      data: sanitizedTxData[0],
      status: TransactionStatusEnum.UserOpSent,
    });
  } else if (data.status === TransactionStatusEnum.Mined) {
    const updatedData = await prisma.transactions.update({
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
    const sanitizedTxData = cleanTxs([updatedData]);

    webhookQueue.add("webhookQueue", {
      id: queueId,
      data: sanitizedTxData[0],
      status: TransactionStatusEnum.UserOpSent,
    });
  }
};
