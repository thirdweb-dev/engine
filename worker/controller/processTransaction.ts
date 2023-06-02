import { FastifyInstance } from "fastify";
import {
  connectWithDatabase,
  createCustomError,
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
import { Knex } from "knex";
import { StatusCodes } from "http-status-codes";

const MIN_TRANSACTION_TO_PROCESS =
  parseInt(getEnv("MIN_TRANSACTION_TO_PROCESS"), 10) ?? 1;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<void> => {
  let knex: Knex | null = null;
  let trx: Knex.Transaction | null = null;
  try {
    // Connect to the DB
    knex = await connectWithDatabase(server);
    trx = await knex.transaction();
    let data: any;
    try {
      data = await getTransactionsToProcess(knex, trx);
    } catch (error) {
      const customError = createCustomError(
        "Error in getting transactions",
        StatusCodes.INTERNAL_SERVER_ERROR,
        "TRANSACTION_PROCESSING_ERROR",
      );
      throw customError;
    }

    if (data.rows.length < MIN_TRANSACTION_TO_PROCESS) {
      server.log.warn(
        `Number of transactions to process less than Minimum Transactions to Process: ${MIN_TRANSACTION_TO_PROCESS}`,
      );
      server.log.warn(
        `Waiting for more transactions requests to start processing`,
      );
      await trx.commit();
      await knex.destroy();
      return;
    }

    for (const tx of data.rows) {
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

      await updateTransactionState(knex, tx.identifier, "processed", trx);

      // Get the nonce for the blockchain transaction
      const txSubmittedNonce = nonce + parseInt(tx.rownum, 10) - 1;

      // Submit transaction to the blockchain
      // Create transaction object
      const txObject = {
        to: tx.contractAddress ?? tx.toAddress,
        from: tx.walletAddress,
        data: tx.encodedInputData,
        nonce: txSubmittedNonce,
      };

      // Send transaction to the blockchain
      let txHash: ethers.providers.TransactionResponse | undefined;
      try {
        txHash = await sdk.getSigner()?.sendTransaction(txObject);
      } catch (error) {
        server.log.debug("Send Transaction errored");
        server.log.error(error);
        server.log.warn(
          `Request-ID: ${tx.identifier} processed but errored out: Commited to db`,
        );
        await updateTransactionState(knex, tx.identifier, "errored", trx);
        await trx.commit();
        await knex.destroy();
        throw error;
      }

      try {
        await updateTransactionState(
          knex,
          tx.identifier,
          "submitted",
          trx,
          txHash,
        );
        server.log.info(
          `Transaction submitted for ${tx.identifier} with Nonce ${txSubmittedNonce}, Tx Hash: ${txHash?.hash} `,
        );
        await updateWalletNonceValue(
          txSubmittedNonce,
          tx.walletAddress,
          tx.chainId,
          knex,
          trx,
        );
      } catch (error) {
        server.log.warn("Transaction failed with error:");
        server.log.error(error);
        throw error;
      }
    }
    await trx.commit();
    await knex.destroy();
  } catch (error) {
    server.log.error(error);
    if (trx) {
      await trx.rollback();
    }
  } finally {
    if (knex) {
      await knex.destroy();
    }
  }
  return;
};
