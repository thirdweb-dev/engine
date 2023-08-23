import { Static } from "@sinclair/typebox";
import {
  transactionResponseSchema,
  TransactionStatusEnum,
} from "../schemas/transaction";

export * from "./dbOperations";
export * from "./openapi";
export * from "./sharedApiSchemas";

type CustomStatusAndConnectionType = {
  message: string;
  closeConnection: boolean;
};

export const getStatusMessageAndConnectionStatus = async (
  data: Static<typeof transactionResponseSchema>,
): Promise<CustomStatusAndConnectionType> => {
  let message =
    "Request is queued. Waiting for transaction to be picked up by worker.";
  let closeConnection = false;

  if (data.status === TransactionStatusEnum.Mined) {
    message = "Transaction mined. Closing connection.";
    closeConnection = true;
  } else if (data.status === TransactionStatusEnum.Errored) {
    message = data.errorMessage || "Transaction errored. Closing connection.";
    closeConnection = true;
  } else if (data.status === TransactionStatusEnum.Submitted) {
    message =
      "Transaction submitted to blockchain. Waiting for transaction to be mined...";
  } else if (data.status === TransactionStatusEnum.Processed) {
    message = "Worker is processing the transaction. Please wait...";
  }

  return { message, closeConnection };
};

export const formatSocketMessage = async (
  data: Static<typeof transactionResponseSchema>,
  message: string,
): Promise<string> => {
  const returnData = JSON.stringify({
    result: JSON.stringify(data),
    queueId: data.queueId,
    message,
  });
  return returnData;
};
