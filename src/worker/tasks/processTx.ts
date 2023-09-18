import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { BigNumber, providers } from "ethers/lib/ethers";
import { StatusCodes } from "http-status-codes";
import { env } from "../../../core/env";
import { createCustomError } from "../../../core/error/customError";
import { getSDK } from "../../../core/sdk/sdk";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { prisma } from "../../db/client";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { logger } from "../../utils/logger";

export const processTx = async () => {
  try {
    let error;

    await prisma.$transaction(
      async (pgtx) => {
        let data;
        try {
          data = await getQueuedTxs({ pgtx });
        } catch (error) {
          const customError = createCustomError(
            "Error in getting transactions from table",
            StatusCodes.INTERNAL_SERVER_ERROR,
            "TRANSACTION_PROCESSING_ERROR",
          );
          throw customError;
        }

        if (data.length < env.MIN_TRANSACTION_TO_PROCESS) {
          logger.worker.warn(
            `Number of transactions to process less than Minimum Transactions to Process: ${env.MIN_TRANSACTION_TO_PROCESS}`,
          );
          logger.worker.warn(
            `Waiting for more transactions requests to start processing`,
          );
          return [];
        }

        for (const tx of data) {
          logger.worker.info(`Processing Transaction: ${tx.queueId}`);
          const walletNonce = await getWalletNonce({
            pgtx,
            address: tx.fromAddress!,
            chainId: tx.chainId!,
          });

          const sdk = await getSDK(
            tx.chainId!.toString(),
            tx.fromAddress!,
            pgtx,
          );

          let [blockchainNonce, gasData] = await Promise.all([
            sdk.wallet.getNonce("pending"),
            getDefaultGasOverrides(sdk.getProvider()),
          ]);

          // TODO: IMPORTANT: Proper nonce management logic! Add comments!
          let currentNonce = BigNumber.from(walletNonce?.nonce ?? 0);
          let txSubmittedNonce = BigNumber.from(0);

          if (BigNumber.from(blockchainNonce).gt(currentNonce)) {
            txSubmittedNonce = BigNumber.from(blockchainNonce);
          } else {
            txSubmittedNonce = BigNumber.from(currentNonce);
          }

          await updateTx({
            pgtx,
            queueId: tx.queueId!,
            status: TransactionStatusEnum.Processed,
          });

          // Get the nonce for the blockchain transaction

          // Submit transaction to the blockchain
          // Create transaction object
          const txObject: providers.TransactionRequest = {
            to: tx.toAddress!,
            from: tx.fromAddress!,
            data: tx.data!,
            nonce: txSubmittedNonce,
            value: tx.value!,
            ...gasData,
          };

          // Send transaction to the blockchain
          let txRes: ethers.providers.TransactionResponse | undefined;
          try {
            txRes = await sdk.getSigner()?.sendTransaction(txObject);
          } catch (err: any) {
            logger.worker.debug("Send Transaction errored");
            logger.worker.warn(
              `Request-ID: ${tx.queueId} processed but errored out: Commited to db`,
            );

            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Errored,
              txData: {
                errorMessage: err.message,
              },
            });

            // Preserve error to throw outside of transaction
            error = err;
            return;
          }

          try {
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Submitted,
              res: txRes,
            });
            logger.worker.info(
              `Transaction submitted for ${tx.queueId!} with Nonce ${txSubmittedNonce}, Tx Hash: ${
                txRes?.hash
              } `,
            );

            await updateWalletNonce({
              pgtx,
              address: tx.fromAddress!,
              chainId: tx.chainId!,
              // TODO: IMPORTANT: This will cause errors!
              // TODO: Should this be txSubmittedNonce or blockchainNonce?
              nonce: txSubmittedNonce.toNumber() + 1,
            });
          } catch (error) {
            logger.worker.warn("Transaction failed with error:");
            logger.worker.error(error);
            throw error;
          }
        }
      },
      {
        timeout: 5 * 60000,
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.worker.error(error);
  }
};
