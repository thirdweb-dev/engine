import { FastifyInstance } from "fastify";
import {
    connectWithDatabase,
    getEnv,
    getSDK,
} from "../../core";
import { getWalletNonce } from "../services/blockchain";
import {
  getWalletDetails,
  getTransactionsToProcess,
  updateTransactionState,
  updateWalletNonceValue,

} from "../services/dbOperations";
import { ethers } from "ethers";

const MIN_TRANSACTION_TO_PROCESS =
  parseInt(getEnv("MIN_TRANSACTION_TO_PROCESS"), 10) ?? 1;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectWithDatabase(server);

    let data :any;
    try {
      data = await getTransactionsToProcess(knex);
    } catch (error) {
      server.log.error(error);
      server.log.warn("Stopping Execution as error occurred.");
      return;
    }

    if (data.rows.length < MIN_TRANSACTION_TO_PROCESS) {
      server.log.warn(
        `Number of transactions to process less than Minimum Transactions to Process: ${MIN_TRANSACTION_TO_PROCESS}`,
      );
      server.log.warn(
        `Waiting for more transactions requests to start processing`,
      );
      return;
    }

    data.rows.forEach(async (tx: any, index: number) => {
      await setTimeout(async () => {
        server.log.info(`Processing Transaction: ${tx.identifier}`);
        const walletData = await getWalletDetails(
          tx.walletAddress,
          tx.chainId,
          knex,
        );

        const sdk = await getSDK(tx.chainId);
        let blockchainNonce = await getWalletNonce(
          tx.walletAddress,
          sdk.getProvider(),
        );

        let nonce = walletData?.lastUsedNonce ?? 0;

        if (blockchainNonce > nonce) {
          nonce = blockchainNonce;
        }

        server.log.debug(
          `Blockchain Nonce: ${blockchainNonce}, Wallet Nonce: ${
            walletData?.lastUsedNonce ?? 0
          }, Tx Nonce: ${nonce}`,
        );

        const trx = await knex.transaction();
        await updateTransactionState(knex, tx.identifier, "processed", trx);
        server.log.debug(`Transaction started for ${tx.identifier}`);

        // Get the nonce for the blockchain transaction
        const txSubmittedNonce = nonce + parseInt(tx.rownum, 10) - 1;
        server.log.debug(
          `Transaction nonce: ${txSubmittedNonce} for ${tx.identifier}`,
        );

        // Submit transaction to the blockchain
        // Create transaction object
        const txObject = {
          to: tx.contractAddress ?? tx.toAddress,
          from: tx.walletAddress,
          data: tx.encodedInputData,
          nonce: txSubmittedNonce,
          customData: {
            "Hello": "World",
          },
        };

        server.log.debug(`Transaction Object: ${JSON.stringify(txObject)}`);

        // Send transaction to the blockchain
        let txHash: ethers.providers.TransactionResponse | undefined;
        try {
          txHash = await sdk.getSigner()?.sendTransaction(txObject);
        } catch (error) {
          server.log.debug("Send Transaction errored");
          server.log.error(error);
          await updateTransactionState(knex, tx.identifier, "errored", trx);
          await trx.commit();
          server.log.warn(`Request-ID: ${tx.identifier} processed but errored out: Commited to db`);
          // Release the database connection
          await knex.destroy();
          return;
        }

        try {
          await updateTransactionState(knex, tx.identifier, "submitted", trx, txHash);
          server.log.debug(`Transaction submitted for ${tx.identifier}`);
          await updateWalletNonceValue(txSubmittedNonce, tx.walletAddress, tx.chainId, knex, trx);
          server.log.debug(
            `Wallet nonce updated ${txSubmittedNonce} for ${tx.identifier}`,
          );

          // If all operations within the transaction succeed, commit the changes
          await trx.commit();
          server.log.info("Transaction committed successfully!");
        } catch (error) {
          // Handle the error & rollback actions
          server.log.warn("Transaction failed with error:");
          server.log.error(error);
          await trx.rollback();
        } finally {
          // Release the database connection
          await knex.destroy();
        }
      }, 1000);

    });
  } catch (error) {
    server.log.error(error);
  }
};
