import { TransactionResponse } from "@ethersproject/abstract-provider";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { StatusCodes } from "http-status-codes";
import { getTxById } from "../../db/transactions/getTxById";
import { updateTx } from "../../db/transactions/updateTx";
import { getSdk } from "../../utils/cache/getSdk";
import { createCustomError } from "../middleware/error";
import { TransactionStatusEnum } from "../schemas/transaction";

interface CancelTransactionAndUpdateParams {
  queueId: string;
}

export const cancelTransactionAndUpdate = async ({
  queueId,
}: CancelTransactionAndUpdateParams) => {
  const txData = await getTxById({ queueId });
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
      case TransactionStatusEnum.Errored:
        throw createCustomError(
          `Cannot cancel user operation because it already errored`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
      case TransactionStatusEnum.Cancelled:
        throw createCustomError(
          `User operation was already cancelled`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
      case TransactionStatusEnum.Mined:
        throw createCustomError(
          `Cannot cancel user operation because it was already mined`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
      case TransactionStatusEnum.Submitted:
      case TransactionStatusEnum.Processed:
        throw createCustomError(
          `Cannot cancel user operation because it was already processed.`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadySubmitted",
        );
      case TransactionStatusEnum.Queued:
        await updateTx({
          queueId,
          data: {
            status: TransactionStatusEnum.Cancelled,
          },
        });
        message = "Transaction cancelled on-database successfully.";
        break;
    }
  } else {
    switch (txData.status) {
      case TransactionStatusEnum.Errored:
        error = createCustomError(
          `Cannot cancel errored transaction with queueId ${queueId}. Error: ${txData.errorMessage}`,
          StatusCodes.BAD_REQUEST,
          "TransactionErrored",
        );
        break;
      case TransactionStatusEnum.Cancelled:
        error = createCustomError(
          `Transaction already cancelled with queueId ${queueId}`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyCancelled",
        );
        break;
      case TransactionStatusEnum.Queued:
        await updateTx({
          queueId,
          data: {
            status: TransactionStatusEnum.Cancelled,
          },
        });
        message = "Transaction cancelled on-database successfully.";
        break;
      case TransactionStatusEnum.Mined:
        error = createCustomError(
          `Transaction already mined with queueId ${queueId}`,
          StatusCodes.BAD_REQUEST,
          "TransactionAlreadyMined",
        );
        break;
      case TransactionStatusEnum.Processed:
      case TransactionStatusEnum.Submitted: {
        const sdk = await getSdk({
          chainId: parseInt(txData.chainId!),
          walletAddress: txData.fromAddress!,
        });

        const txReceipt = await sdk
          .getProvider()
          .getTransactionReceipt(txData.transactionHash!);

        if (txReceipt) {
          message =
            "Transaction already mined. Cannot cancel transaction on-chain.";
          break;
        }

        const gasOverrides = await getDefaultGasOverrides(sdk.getProvider());
        transferTransactionResult = await sdk.wallet.sendRawTransaction({
          to: txData.fromAddress!,
          from: txData.fromAddress!,
          data: "0x",
          value: "0x00",
          nonce: txData.nonce!,
          ...gasOverrides,
          maxFeePerGas: BigNumber.from(gasOverrides.maxFeePerGas).mul(2),
          maxPriorityFeePerGas: BigNumber.from(
            gasOverrides.maxPriorityFeePerGas,
          ).mul(2),
        });

        message = "Cancellation Transaction sent on chain successfully.";

        await updateTx({
          queueId,
          data: {
            status: TransactionStatusEnum.Cancelled,
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
