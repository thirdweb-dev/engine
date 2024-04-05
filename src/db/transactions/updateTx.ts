import { Transactions } from "@prisma/client";
import { BigNumber, ethers } from "ethers";
import { PrismaTransaction } from "../../schema/prisma";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { TransactionStatus } from "../../server/schemas/transaction";
import { WebhookQueue } from "../../worker/queues/queues";
import { getPrismaWithPostgresTx } from "../client";

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

  let updatedTx: Transactions | null = null;

  switch (data.status) {
    case TransactionStatus.Cancelled:
      updatedTx = await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          cancelledAt: new Date(),
        },
      });
      break;
    case TransactionStatus.Errored:
      updatedTx = await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          errorMessage: data.errorMessage,
        },
      });
      break;
    case TransactionStatus.Sent:
      updatedTx = await prisma.transactions.update({
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
          value: data.res?.value?.toString(),
        },
      });
      break;
    case TransactionStatus.UserOpSent:
      updatedTx = await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          sentAt: data.sentAt,
          userOpHash: data.userOpHash,
        },
      });
      break;
    case TransactionStatus.Mined:
      updatedTx = await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          transactionHash: data.transactionHash,
          minedAt: data.minedAt,
          blockNumber: data.blockNumber,
          onChainTxStatus: data.onChainTxStatus,
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

  if (updatedTx) {
    await WebhookQueue.add({
      type: WebhooksEventTypes.ALL_TRANSACTIONS,
      status: data.status,
      tx: updatedTx,
    });
  }
};
