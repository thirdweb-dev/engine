import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError, env, getSDK } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getQueuedTxs } from "../../src/db/transactions/getQueuedTxs";
import { updateTx } from "../../src/db/transactions/updateTx";
import { getWalletDetails } from "../../src/db/wallets/getWalletDetails";
import { updateWalletNonce } from "../../src/db/wallets/updateWalletNonce";

const MIN_TRANSACTION_TO_PROCESS = env.MIN_TRANSACTION_TO_PROCESS;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<string[]> => {
  let processedIds: string[] = [];
  try {
    // Connect to the DB
    let data;
    try {
      data = await getQueuedTxs();
    } catch (error) {
      const customError = createCustomError(
        "Error in getting transactions from table",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "TRANSACTION_PROCESSING_ERROR",
      );
      throw customError;
    }

    if (data.length < MIN_TRANSACTION_TO_PROCESS) {
      server.log.warn(
        `Number of transactions to process less than Minimum Transactions to Process: ${MIN_TRANSACTION_TO_PROCESS}`,
      );
      server.log.warn(
        `Waiting for more transactions requests to start processing`,
      );
      return [];
    }

    processedIds = data.map((row: any) => row.identifier);
    for (const tx of data) {
      server.log.info(`Processing Transaction: ${tx.queueId}`);
      const walletDetails = await getWalletDetails({
        address: tx.fromAddress!,
        chainId: tx.chainId!,
      });
      const sdk = await getSDK(tx.chainId!.toString(), tx.fromAddress!);

      let [blockchainNonce, gasData, currentBlockNumber] = await Promise.all([
        sdk.wallet.getNonce("pending"),
        getDefaultGasOverrides(sdk.getProvider()),
        sdk.getProvider().getBlockNumber(),
      ]);

      // TODO: IMPORTANT: Proper nonce management logic! Add comments!
      let currentNonce = BigNumber.from(walletDetails?.nonce ?? 0);
      let txSubmittedNonce = BigNumber.from(0);

      if (BigNumber.from(blockchainNonce).gt(currentNonce)) {
        txSubmittedNonce = BigNumber.from(blockchainNonce);
      } else {
        txSubmittedNonce = BigNumber.from(currentNonce);
      }

      server.log.error(`>>> [NONCE] - ${txSubmittedNonce}`);

      await updateTx({
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
      } catch (error: any) {
        server.log.debug("Send Transaction errored");
        server.log.warn(
          `Request-ID: ${tx.queueId} processed but errored out: Commited to db`,
        );

        await updateTx({
          queueId: tx.queueId!,
          status: TransactionStatusEnum.Errored,
          txData: {
            errorMessage: error.message,
          },
        });
        throw error;
      }

      try {
        await updateTx({
          queueId: tx.queueId!,
          status: TransactionStatusEnum.Submitted,
          res: txRes,
        });
        server.log.info(
          `Transaction submitted for ${tx.queueId!} with Nonce ${txSubmittedNonce}, Tx Hash: ${
            txRes?.hash
          } `,
        );

        await updateWalletNonce({
          address: tx.fromAddress!,
          chainId: tx.chainId!,
          // TODO: IMPORTANT: This will cause errors!
          // TODO: Should this be txSubmittedNonce or blockchainNonce?
          nonce: txSubmittedNonce.toNumber() + 1,
        });
      } catch (error) {
        server.log.warn("Transaction failed with error:");
        server.log.error(error);
        throw error;
      }
    }
  } catch (error) {
    server.log.error(error);
  } finally {
    return processedIds;
  }
};
