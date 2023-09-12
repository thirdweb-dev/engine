import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { connectToDatabase, env, getSDK } from "../../core";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";
import {
  getTransactionForRetry,
  getWalletDetailsWithTransaction,
  updateTransactionState,
} from "../services/dbOperations";

const RETRY_TX_ENABLED = env.RETRY_TX_ENABLED;
const MAX_FEE_PER_GAS_FOR_RETRY = BigNumber.from(env.MAX_FEE_PER_GAS_FOR_RETRY);
const MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY = BigNumber.from(
  env.MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY,
);

export const retryTransactions = async (server: FastifyInstance) => {
  let knex: Knex | undefined;
  let trx: Knex.Transaction | undefined;
  const tenMinutesInMilliseconds = 10 * 60 * 1000;
  try {
    knex = await connectToDatabase();
    if (!RETRY_TX_ENABLED) {
      server.log.warn("Retry Tx Cron is disabled");
      return;
    }
    server.log.info("Running Cron to Retry transactions on blockchain");
    trx = await knex.transaction();
    const transactions = await getTransactionForRetry(knex, trx);

    if (transactions.length === 0) {
      server.log.warn("No transactions to retry");
      await trx.rollback();
      await trx.destroy();
      await knex.destroy();
      return;
    }

    const txReceiptsWithChainId = await getTransactionReceiptWithBlockDetails(
      server,
      transactions,
    );

    for (let txReceiptData of txReceiptsWithChainId) {
      // Check if transaction got mined on chain
      if (
        txReceiptData.blockNumber != -1 &&
        txReceiptData.chainId &&
        txReceiptData.queueId &&
        txReceiptData.txHash != "" &&
        txReceiptData.effectiveGasPrice != BigNumber.from(-1) &&
        txReceiptData.timestamp != -1
      ) {
        server.log.debug(
          `Got receipt for tx: ${txReceiptData.txHash}, queueId: ${txReceiptData.queueId}, effectiveGasPrice: ${txReceiptData.effectiveGasPrice}`,
        );
      } else {
        //Retry Logic
        const walletData = await getWalletDetailsWithTransaction(
          txReceiptData.txData.walletAddress!,
          txReceiptData.txData.chainId!,
          knex,
          trx,
        );

        const sdk = await getSDK(
          txReceiptData.txData.chainId!,
          txReceiptData.txData.walletAddress!,
        );
        const currentBlockNumber = await sdk.getProvider().getBlockNumber();

        if (
          currentBlockNumber - txReceiptData.txData.txSubmittedAtBlockNumber! >
          env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
        ) {
          server.log.debug(
            `Retrying tx: ${txReceiptData.txHash}, queueId: ${txReceiptData.queueId} with higher gas values`,
          );

          const gasData = await getDefaultGasOverrides(sdk.getProvider());
          server.log.debug(
            `Gas Data MaxFeePerGas: ${gasData.maxFeePerGas}, MaxPriorityFeePerGas: ${gasData.maxPriorityFeePerGas}, gasPrice`,
          );

          // Re-Submit transaction to the blockchain
          // Create transaction object
          const txObject: providers.TransactionRequest = {
            to:
              txReceiptData.txData.contractAddress ??
              txReceiptData.txData.toAddress,
            from: txReceiptData.txData.walletAddress,
            data: txReceiptData.txData.encodedInputData,
            nonce: txReceiptData.txData.submittedTxNonce,
            value: txReceiptData.txData.txValue,
            ...gasData,
          };

          // Override gas values from DB if flag is true
          if (txReceiptData.txData.overrideGasValuesForTx) {
            server.log.info(
              `Setting Gas Values from DB as override flag is set to true. MaxFeePerGas: ${txReceiptData.txData.overrideMaxFeePerGas}, MaxPriorityFeePerGas: ${txReceiptData.txData.overrideMaxPriorityFeePerGas} for queueId: ${txReceiptData.queueId}`,
            );
            txObject.maxFeePerGas = txReceiptData.txData.overrideMaxFeePerGas;
            txObject.maxPriorityFeePerGas =
              txReceiptData.txData.overrideMaxPriorityFeePerGas;
          } else if (
            gasData.maxFeePerGas?.gt(MAX_FEE_PER_GAS_FOR_RETRY!) ||
            gasData.maxPriorityFeePerGas?.gt(
              MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY!,
            )
          ) {
            server.log.warn(
              `${walletData.slug.toUpperCase()} Chain Gas Price is higher than Max Threshold for retrying transaction ${
                txReceiptData.queueId
              }. Will try again after ${
                env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
              } blocks or in 30 seconds`,
            );
            continue;
          }

          // Send transaction to the blockchain
          let txHash: ethers.providers.TransactionResponse | undefined;
          try {
            txHash = await sdk.getSigner()?.sendTransaction(txObject);
          } catch (error: any) {
            server.log.debug("Send Transaction errored");
            server.log.warn(
              `Request-ID: ${txReceiptData.queueId} processed but errored out: Commited to db`,
            );
            await trx.commit();
            await trx.destroy();
            await knex.destroy();
            throw error;
          }

          await updateTransactionState(
            knex,
            txReceiptData.txData.identifier!,
            "submitted",
            trx,
            txHash,
            {
              numberOfRetries: txReceiptData.txData.numberOfRetries! + 1,
              txSubmittedAtBlockNumber: currentBlockNumber,
            },
          );
          server.log.info(
            `Transaction re-submitted for ${txReceiptData.queueId} with Nonce ${txReceiptData.txData.submittedTxNonce}, Tx Hash: ${txHash?.hash}`,
          );
        } else {
          server.log.info(
            `Will retry later Request with queueId ${
              txReceiptData.queueId
            } after ${
              env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
            } blocks, Elasped Blocks: ${
              currentBlockNumber -
              txReceiptData.txData.txSubmittedAtBlockNumber!
            }`,
          );
        }
      }
    }

    await trx.commit();
    await trx.destroy();
    await knex.destroy();
    return;
  } catch (error) {
    if (trx) {
      await trx.rollback();
      await trx.destroy();
    }
    if (knex) {
      await knex.destroy();
    }
    server.log.error(error);
    return;
  }
};
