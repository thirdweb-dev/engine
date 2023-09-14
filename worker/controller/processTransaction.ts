import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError, env, getSDK } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { prisma } from "../../src/db/client";
import { getQueuedTxs } from "../../src/db/transactions/getQueuedTxs";
import { updateTx } from "../../src/db/transactions/updateTx";
import { getWalletNonce } from "../../src/db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../src/db/wallets/updateWalletNonce";

const MIN_TRANSACTION_TO_PROCESS = env.MIN_TRANSACTION_TO_PROCESS;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<string[]> => {
  let processedIds: string[] = [];
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
          const walletNonce = await getWalletNonce({
            pgtx,
            address: tx.fromAddress!,
            chainId: tx.chainId!,
          });
          server.log.error(`>>> [Nonce] ${walletNonce?.nonce}`);

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
            server.log.debug("Send Transaction errored");
            server.log.warn(
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
            server.log.info(
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
            server.log.warn("Transaction failed with error:");
            server.log.error(error);
            throw error;
          }
        }
      },
      {
        timeout: 30000,
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    server.log.error(error);
  } finally {
    return processedIds;
  }
};
