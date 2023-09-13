import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Knex } from "knex";
import { connectToDatabase, createCustomError, env, getSDK } from "../../core";
import {
  getTransactionsToProcess,
  getWalletDetailsWithTransaction,
  updateTransactionState,
  updateWalletNonceValue,
} from "../services/dbOperations";

const MIN_TRANSACTION_TO_PROCESS = env.MIN_TRANSACTION_TO_PROCESS;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<string[]> => {
  let knex: Knex | null = null;
  let trx: Knex.Transaction | null = null;
  let processedIds: string[] = [];
  try {
    // Connect to the DB
    knex = await connectToDatabase();
    trx = await knex.transaction();
    let data: any;
    try {
      data = await getTransactionsToProcess(knex, trx);
    } catch (error) {
      const customError = createCustomError(
        "Error in getting transactions from table",
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
      await trx.destroy();
      await knex.destroy();
      return [];
    }

    processedIds = data.rows.map((row: any) => row.identifier);
    for (const tx of data.rows) {
      server.log.info(`Processing Transaction: ${tx.identifier}`);
      const walletData = await getWalletDetailsWithTransaction(
        tx.walletAddress,
        tx.chainId,
        knex,
        trx,
      );

      const sdk = await getSDK(tx.chainId, {
        walletAddress: tx.walletAddress,
        awsKmsKeyId: walletData?.awsKmsKeyId,
        gcpKmsKeyId: walletData?.gcpKmsKeyId,
        gcpKmsKeyRingId: walletData?.gcpKmsKeyRingId,
        gcpKmsLocationId: walletData?.gcpKmsLocationId,
        gcpKmsKeyVersionId: walletData?.gcpKmsKeyVersionId,
      });

      let [blockchainNonce, gasData, currentBlockNumber] = await Promise.all([
        sdk.wallet.getNonce("pending"),
        getDefaultGasOverrides(sdk.getProvider()),
        sdk.getProvider().getBlockNumber(),
      ]);

      let lastUsedNonce = BigNumber.from(walletData?.lastUsedNonce ?? -1);
      let txSubmittedNonce = BigNumber.from(0);

      if (BigNumber.from(blockchainNonce).gt(lastUsedNonce)) {
        txSubmittedNonce = BigNumber.from(blockchainNonce);
      } else {
        txSubmittedNonce = BigNumber.from(1).add(lastUsedNonce);
      }

      await updateTransactionState(knex, tx.identifier, "processed", trx);
      // Get the nonce for the blockchain transaction

      // Submit transaction to the blockchain
      // Create transaction object
      const txObject: providers.TransactionRequest = {
        to: tx.contractAddress ?? tx.toAddress,
        from: tx.walletAddress,
        data: tx.encodedInputData,
        nonce: txSubmittedNonce,
        value: tx.txValue,
        ...gasData,
      };

      // Send transaction to the blockchain
      let txHash: ethers.providers.TransactionResponse | undefined;
      try {
        txHash = await sdk.getSigner()?.sendTransaction(txObject);
      } catch (error: any) {
        server.log.debug("Send Transaction errored");
        server.log.warn(
          `Request-ID: ${tx.identifier} processed but errored out: Commited to db`,
        );
        await updateTransactionState(
          knex,
          tx.identifier,
          "errored",
          trx,
          undefined,
          { errorMessage: error.message },
        );
        await trx.commit();
        await trx.destroy();
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
          {
            txSubmittedAtBlockNumber: currentBlockNumber,
          },
        );
        server.log.info(
          `Transaction submitted for ${tx.identifier} with Nonce ${txSubmittedNonce}, Tx Hash: ${txHash?.hash} `,
        );
        await updateWalletNonceValue(
          txSubmittedNonce,
          BigNumber.from(blockchainNonce),
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
    await trx.destroy();
    await knex.destroy();
  } catch (error) {
    server.log.error(error);
    if (trx && trx.isCompleted() === false) {
      server.log.warn("Rolling back transaction");
      await trx.rollback();
      await trx.destroy();
    }
  } finally {
    if (knex) {
      await knex.destroy();
    }
    return processedIds;
  }
};
