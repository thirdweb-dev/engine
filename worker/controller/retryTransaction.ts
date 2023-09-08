import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { Knex } from "knex";
import { connectWithDatabase, env } from "../../core";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";
import {
  getSubmittedTransactionsToRetry,
  updateTransactionState,
} from "../services/dbOperations";

const RETRY_TX_ENABLED = env.RETRY_TX_ENABLED;

export const retryTransaction = async (server: FastifyInstance) => {
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
