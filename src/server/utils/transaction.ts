import { TransactionResponse } from "@ethersproject/abstract-provider";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { StatusCodes } from "http-status-codes";
import { getTxById } from "../../db/transactions/getTxById";
import { updateTx } from "../../db/transactions/updateTx";
import { PrismaTransaction } from "../../schema/prisma";
import { getSdk } from "../../utils/cache/getSdk";
import { multiplyGasOverrides } from "../../utils/gas";
import { createCustomError } from "../middleware/error";
import { TransactionStatus } from "../schemas/transaction";

interface CancelTransactionAndUpdateParams {
  queueId: string;
  pgtx?: PrismaTransaction;
}

export const cancelTransactionAndUpdate = async ({
  queueId,
  pgtx,
}: CancelTransactionAndUpdateParams) => {
  const txData = await getTxById({ queueId, pgtx });
  if (!txData) {
    return {
      message: `Transaction ${queueId} not found.`,
    };
  }

  let message = "";
  let error = null;
  let transferTransactionResult: TransactionResponse | null = null;

  if (txData.signerAddress && txData.accountAddress) {
    switch (txData.status) {
      case TransactionStatus.Errored:
        throw createCustomError(
          `Cannot cancel user operation because it already errored`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
      case TransactionStatus.Cancelled:
        throw createCustomError(
          `User operation was already cancelled`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
      case TransactionStatus.Mined:
        throw createCustomError(
          `Cannot cancel user operation because it was already mined`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
      case TransactionStatus.Sent:
        throw createCustomError(
          `Cannot cancel user operation because it was already processed.`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadySubmitted",
        );
      case TransactionStatus.Queued:
        await updateTx({
          queueId,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        message = "Transaction cancelled on-database successfully.";
        break;
    }
  } else {
    switch (txData.status) {
      case TransactionStatus.Errored:
        error = createCustomError(
          `Transaction has already errored: ${txData.errorMessage}`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
        break;
      case TransactionStatus.Cancelled:
        error = createCustomError(
          "Transaction is already cancelled.",
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
        break;
      case TransactionStatus.Queued:
        await updateTx({
          queueId,
          pgtx,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        message = "Transaction cancelled successfully.";
        break;
      case TransactionStatus.Mined:
        error = createCustomError(
          "Transaction already mined.",
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
        break;
      case TransactionStatus.Sent: {
        const sdk = await getSdk({
          chainId: parseInt(txData.chainId!),
          walletAddress: txData.fromAddress!,
        });

        const txReceipt = await sdk
          .getProvider()
          .getTransactionReceipt(txData.transactionHash!);
        if (txReceipt) {
          message = "Transaction already mined.";
          break;
        }

        const gasOverrides = await getDefaultGasOverrides(sdk.getProvider());
        transferTransactionResult = await sdk.wallet.sendRawTransaction({
          to: txData.fromAddress!,
          from: txData.fromAddress!,
          data: "0x",
          value: "0x00",
          nonce: txData.nonce!,
          ...multiplyGasOverrides(gasOverrides, 2),
        });

        message = "Transaction cancelled successfully.";

        await updateTx({
          queueId,
          pgtx,
          data: {
            status: TransactionStatus.Cancelled,
          },
        });
        break;
      }
      default:
        break;
    }
  }

  if (error) {
    throw error;
  }

  return {
    message,
    transactionHash: transferTransactionResult?.hash,
  };
};
