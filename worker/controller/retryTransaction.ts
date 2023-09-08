import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { connectWithDatabase, env, getSDK } from "../../core";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";
import {
  getSubmittedTransactionsToRetry,
  getWalletDetailsWithTransaction,
  updateTransactionState,
} from "../services/dbOperations";

const RETRY_TX_ENABLED = env.RETRY_TX_ENABLED;

export const retryTransactions = async (server: FastifyInstance) => {
  let knex: Knex | undefined;
  let trx: Knex.Transaction | undefined;
  try {
    knex = await connectWithDatabase();
    if (!RETRY_TX_ENABLED) {
      server.log.warn("Retry Tx Cron is disabled");
      return;
    }
    server.log.info(
      "Running Cron to check for mined transactions on blockchain",
    );
    trx = await knex.transaction();
    const transactions = await getSubmittedTransactionsToRetry(knex, trx);

    if (transactions.length === 0) {
      server.log.warn("No transactions to check for mined status");
      await trx.rollback();
      await trx.destroy();
      await knex.destroy();
      return;
    }

    const blockNumbers: {
      blockNumber: number;
      chainId: string;
      queueId: string;
    }[] = [];
    const txReceiptsWithChainId = await getTransactionReceiptWithBlockDetails(
      server,
      transactions,
    );

    for (let txReceiptData of txReceiptsWithChainId) {
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
        await updateTransactionState(
          knex,
          txReceiptData.queueId,
          "mined",
          trx,
          undefined,
          undefined,
          {
            gasPrice: BigNumber.from(
              txReceiptData.effectiveGasPrice,
            ).toString(),
            txMinedTimestamp: new Date(txReceiptData.timestamp),
            blockNumber: txReceiptData.blockNumber,
          },
        );
      } else {
        //Retry Logic
        server.log.debug(
          `Receipt not found for tx: ${txReceiptData.txHash}, queueId: ${txReceiptData.queueId},
            gasLimit ${txReceiptData.txData.gasLimit}, gasPrice gasLimit ${txReceiptData.txData.gasLimit}. retrying with higher gas limit`,
        );

        const walletData = await getWalletDetailsWithTransaction(
          txReceiptData.txData.walletAddress!,
          txReceiptData.txData.chainId!,
          knex,
          trx,
        );

        const sdk = await getSDK(txReceiptData.txData.chainId!, {
          walletAddress: txReceiptData.txData.walletAddress!,
          awsKmsKeyId: walletData?.awsKmsKeyId,
          gcpKmsKeyId: walletData?.gcpKmsKeyId,
          gcpKmsKeyRingId: walletData?.gcpKmsKeyRingId,
          gcpKmsLocationId: walletData?.gcpKmsLocationId,
          gcpKmsKeyVersionId: walletData?.gcpKmsKeyVersionId,
        });

        const gasData = await getDefaultGasOverrides(sdk.getProvider());

        const oldMaxFeePerGas = BigNumber.from(
          txReceiptData.txData.maxFeePerGas!,
        );
        const oldMaxPriorityFeePerGas = BigNumber.from(
          txReceiptData.txData.maxPriorityFeePerGas!,
        );

        server.log.debug(
          `oldMaxFeePerGas: ${oldMaxFeePerGas}, oldMaxPriorityFeePerGas: ${oldMaxPriorityFeePerGas}`,
        );
        const newMaxFeePerGas = oldMaxFeePerGas.add(
          oldMaxFeePerGas.mul(10).div(100),
        );
        const newMaxPriorityFeePerGas = oldMaxPriorityFeePerGas.add(
          oldMaxPriorityFeePerGas.mul(10).div(100),
        );
        server.log.debug(
          `newMaxFeePerGas: ${newMaxFeePerGas}, newMaxPriorityFeePerGas: ${newMaxPriorityFeePerGas}`,
        );
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
          maxFeePerGas:
            newMaxFeePerGas < gasData.maxFeePerGas! &&
            gasData.maxFeePerGas?.gt(2500000000)
              ? newMaxFeePerGas
              : gasData.maxFeePerGas,
          maxPriorityFeePerGas:
            newMaxPriorityFeePerGas < gasData.maxPriorityFeePerGas!
              ? gasData.maxPriorityFeePerGas
              : newMaxPriorityFeePerGas,
        };

        // Send transaction to the blockchain
        let txHash: ethers.providers.TransactionResponse | undefined;
        try {
          txHash = await sdk.getSigner()?.sendTransaction(txObject);
        } catch (error: any) {
          server.log.debug("Send Transaction errored");
          server.log.warn(
            `Request-ID: ${txReceiptData.queueId} processed but errored out: Commited to db`,
          );
          await updateTransactionState(
            knex,
            txReceiptData.queueId,
            "errored",
            trx,
            undefined,
            error.message,
          );
          await trx.commit();
          await trx.destroy();
          await knex.destroy();
          throw error;
        }

        // try {
        await updateTransactionState(
          knex,
          txReceiptData.txData.identifier!,
          "submitted",
          trx,
          txHash,
        );
        server.log.info(
          `Transaction re-submitted for ${txReceiptData.queueId} with Nonce ${txReceiptData.txData.submittedTxNonce}, Tx Hash: ${txHash?.hash}`,
        );
        // } catch (error: any) {
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
