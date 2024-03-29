import { Transactions } from "@prisma/client";
import { Static } from "@sinclair/typebox";
import { BigNumber, ethers } from "ethers";
import { PrismaTransaction } from "../../schema/prisma";
import {
  TransactionStatus,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx, webhookQueue } from "../client";
import { cleanTxs } from "./cleanTxs";

interface UpdateTxParams {
  pgtx?: PrismaTransaction;
  queueId: string;
  data: UpdateTxData;
}

type UpdateTxData =
  | {
      status: TransactionStatus.Cancelled;
    }
  | {
      status: TransactionStatus.Errored;
      errorMessage: string;
    }
  | {
      status: TransactionStatus.Sent;
      sentAt: Date;
      transactionHash: string;
      res: ethers.providers.TransactionRequest;
      sentAtBlockNumber: number;
      retryCount?: number;
    }
  | {
      status: TransactionStatus.UserOpSent;
      sentAt: Date;
      userOpHash: string;
    }
  | {
      status: TransactionStatus.Mined;
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
  let updatedData: Transactions | null = null;
  let sanitizedTxData: Static<typeof transactionResponseSchema>[] = [];
  if (data.status === TransactionStatus.Cancelled) {
    updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        cancelledAt: new Date(),
      },
    });
  } else if (data.status === TransactionStatus.Errored) {
    updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        errorMessage: data.errorMessage,
      },
    });
  } else if (data.status === TransactionStatus.Sent) {
    updatedData = await prisma.transactions.update({
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
  } else if (data.status === TransactionStatus.UserOpSent) {
    updatedData = await prisma.transactions.update({
      where: {
        id: queueId,
      },
      data: {
        sentAt: data.sentAt,
        userOpHash: data.userOpHash,
      },
    });
  } else if (data.status === TransactionStatus.Mined) {
    updatedData = await prisma.transactions.update({
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
  }

  if (updatedData) {
    sanitizedTxData = cleanTxs([updatedData]);
    webhookQueue.add(queueId, {
      id: queueId,
      data: sanitizedTxData[0],
      status: data.status,
    });
  }
};
