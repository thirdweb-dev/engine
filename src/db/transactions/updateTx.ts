import { Transactions } from "@prisma/client";
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
      sentAtBlock: bigint;
      transactionHash: string;
      retryCount?: number;
      nonce: number;
      transactionType: number;
      gas: bigint;
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
      value: bigint;
    }
  | {
      status: TransactionStatus.UserOpSent;
      sentAt: Date;
      userOpHash: string;
    }
  | {
      status: TransactionStatus.Mined;
      minedAt: Date;
      minedAtBlock: bigint;
      onChainTxStatus: "success" | "reverted";
      transactionHash: string;
      transactionType?: number;
      gasPrice: bigint;
      gas: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
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
          sentAtBlockNumber: Number(data.sentAtBlock),
          transactionHash: data.transactionHash,
          retryCount: data.retryCount,
          nonce: data.nonce,
          transactionType: data.transactionType,
          gasLimit: data.gas.toString(),
          gasPrice: data.gasPrice?.toString(),
          maxFeePerGas: data.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: data.maxPriorityFeePerGas?.toString(),
          value: data.value.toString(),
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
          blockNumber: Number(data.minedAtBlock),
          onChainTxStatus: data.onChainTxStatus === "success" ? 1 : 0,
          transactionType: data.transactionType,
          gasPrice: data.gasPrice.toString(),
          gasLimit: data.gas.toString(),
          maxFeePerGas: data.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: data.maxPriorityFeePerGas?.toString(),
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
