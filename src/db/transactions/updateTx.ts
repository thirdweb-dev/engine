import { Transactions } from "@prisma/client";
import { providers } from "ethers";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { prisma } from "../client";

interface UpdateTxParams {
  queueId: string;
  status: TransactionStatusEnum;
  // TODO: Receipt never actually gets used here... should get passed through.
  res?: providers.TransactionResponse;
  txData?: Partial<Transactions>;
}

export const updateTx = async ({
  queueId,
  status,
  res,
  txData,
}: UpdateTxParams) => {
  switch (status) {
    case TransactionStatusEnum.Submitted:
      console.log("Updating to submitted...");
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          sentAt: new Date(),
          nonce: res?.nonce,
          transactionHash: res?.hash,
          transactionType: res?.type,
          gasPrice: res?.gasPrice?.toString(),
          gasLimit: res?.gasLimit?.toString(),
          maxFeePerGas: res?.maxFeePerGas?.toString(),
          maxPriorityFeePerGas: res?.maxPriorityFeePerGas?.toString(),
          ...txData,
        },
      });
      break;
    case TransactionStatusEnum.Processed:
      console.log("Updating to processed...");
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          processedAt: new Date(),
          ...txData,
        },
      });
      break;
    case TransactionStatusEnum.Errored:
      console.log("Updating to errored...");
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          // TODO: Should we be keeping track of erroredAt here?
          ...txData,
        },
      });
      break;
    case TransactionStatusEnum.Mined:
      console.log("Updating to mined...");
      await prisma.transactions.update({
        where: {
          id: queueId,
        },
        data: {
          // TODO: minedAt will always get overwritten in blockchainReader.ts
          minedAt: new Date(),
          ...txData,
        },
      });
      break;
  }
};
