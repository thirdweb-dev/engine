import { FastifyInstance } from "fastify";
import { connectToDB } from "../helpers/database/dbConnect";
import { getEnv } from "../helpers/loadEnv";
import { getWalletNonce } from "../services/blockchain";
import { getWalletDetails } from "../services/dbOperations";
import { getSDK } from "../helpers";

const MIN_TRANSACTION_TO_PROCESS =
  parseInt(getEnv("MIN_TRANSACTION_TO_PROCESS"), 10) ?? 1;

const TRANSACTIONS_TO_BATCH =
parseInt(getEnv("TRANSACTIONS_TO_BATCH"), 10) ?? 10;

export const processTransaction = async (
  server: FastifyInstance,
): Promise<void> => {
  try {
    // Connect to the DB
    const knex = await connectToDB(server);

    const data = await knex("transactions")
      .where("txProcessed", false)
      .where("txMined", false)
      .where("txErrored", false)
      .orderBy("createdTimestamp")
      .limit(TRANSACTIONS_TO_BATCH);

    if (data.length < MIN_TRANSACTION_TO_PROCESS) {
      server.log.warn(
        `Number of transactions to process less than Minimum Transactions to Process: ${MIN_TRANSACTION_TO_PROCESS}`,
      );
      server.log.warn(
        `Waiting for more transactions requests to start processing`,
      );
      return;
    }

    data.forEach(async (tx: any, index: number) => {
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
          `Blockchain Nonce: ${blockchainNonce}, Wallet Nonce: ${walletData?.lastUsedNonce ?? 0}, Tx Nonce: ${nonce}`,
        );

        const trx = await knex.transaction();
        server.log.debug(`Transaction started for ${tx.identifier}`);
        const txSubmittedNonce = nonce + index;
        server.log.debug(
          `Transaction nonce: ${txSubmittedNonce} for ${tx.identifier}`,
        );

        // Submit transaction to the blockchain
        const txObject = {
          to: tx.contractAddress ?? tx.toAddress,
          from: tx.walletAddress,
          data: tx.encodedInputData,
          nonce: txSubmittedNonce,
        };
        server.log.debug(`Transaction Object: ${JSON.stringify(txObject)}`);

        let txHash;
        try {
          txHash = await sdk.getSigner()?.sendTransaction(txObject);
        } catch (error) {
          server.log.debug('Send Transaction errored');

          await knex("transactions")
            .update({
              txProcessed: true,
              txErrored: true,
              txProcessedTimestamp: new Date(),
              updatedTimestamp: new Date(),
            })
            .where("identifier", tx.identifier)
            .transacting(trx);
          
          await trx.commit();
          server.log.debug('Request processed but errored out: Commited to db')
          // Release the database connection
          await knex.destroy();
          return;
        }

        try {
          await knex("transactions")
            .update({
              txProcessed: true,
              txSubmitted: true,
              txProcessedTimestamp: new Date(),
              txSubmittedTimestamp: new Date(),
              updatedTimestamp: new Date(),
              submittedTxNonce: txHash?.nonce,
              txHash: txHash?.hash,
              txType: txHash?.type,
            })
            .where("identifier", tx.identifier)
            .transacting(trx);

          server.log.debug(`Transaction submitted for ${tx.identifier}`);

          await knex("wallets")
            .update({
              lastUsedNonce: txSubmittedNonce,
            })
            .where("walletAddress", tx.walletAddress)
            .where("chainId", tx.chainId)
            .transacting(trx);

          server.log.debug(
            `Wallet nonce updated ${txSubmittedNonce} for ${tx.identifier}`,
          );

          // If all operations within the transaction succeed, commit the changes
          await trx.commit();
          server.log.info("Transaction committed successfully!");
        } catch (error) {
          // Handle the error & rollback actions
          console.error("Transaction failed:", error);

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
