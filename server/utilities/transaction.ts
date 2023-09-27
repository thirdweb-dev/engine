import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../core";
import { getTxById } from "../../src/db/transactions/getTxById";
import { updateTx } from "../../src/db/transactions/updateTx";
import { TransactionStatusEnum } from "../schemas/transaction";

export const cancelTransactionAndUpdate = async (
  queueId: string,
  walletAddress: string,
) => {
  const txData = await getTxById({ queueId });

  console.log("txData", txData);

  if (!txData) {
    const error = createCustomError(
      `Transaction not found with queueId ${queueId}`,
      StatusCodes.NOT_FOUND,
      "QueueIdNotFound",
    );
    throw error;
  }

  let error = null;

  switch (txData.status) {
    case TransactionStatusEnum.Cancelled:
      error = createCustomError(
        `Transaction already cancelled with queueId ${queueId}`,
        StatusCodes.BAD_REQUEST,
        "TransactionAlreadyCancelled",
      );
      break;
    case TransactionStatusEnum.Queued:
      console.log("inside Mined/Queued");
      await updateTx({
        queueId,
        status: TransactionStatusEnum.Cancelled,
        txData: {
          cancelledAt: new Date(),
        },
      });
      break;
    case TransactionStatusEnum.Mined:
      console.log("inside Mined");
      error = createCustomError(
        `Transaction already mined with queueId ${queueId}`,
        StatusCodes.BAD_REQUEST,
        "TransactionAlreadyMined",
      );
      break;
    case TransactionStatusEnum.Processed:
    case TransactionStatusEnum.Submitted:
      await updateTx({
        queueId,
        status: TransactionStatusEnum.Cancelled,
        txData: {
          cancelledAt: new Date(),
          data: "0x",
          value: "0x00",
          toAddress: walletAddress,
          functionName: null,
          functionArgs: null,
        },
      });
      break;

    default:
      break;
  }

  if (error) {
    throw error;
  }
};
