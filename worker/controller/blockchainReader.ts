import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { env } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getSentTxs } from "../../src/db/transactions/getSentTxs";
import { updateTx } from "../../src/db/transactions/updateTx";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";

const MINED_TX_CRON_ENABLED = env.MINED_TX_CRON_ENABLED;

export const checkForMinedTransactionsOnBlockchain = async (
  server: FastifyInstance,
) => {
  try {
    if (!MINED_TX_CRON_ENABLED) {
      server.log.warn("Mined Tx Cron is disabled");
      return;
    }
    server.log.info(
      "Running Cron to check for mined transactions on blockchain",
    );
    const transactions = await getSentTxs();

    if (transactions.length === 0) {
      server.log.warn("No transactions to check for mined status");
      return;
    }

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

        await updateTx({
          queueId: txReceiptData.queueId,
          status: TransactionStatusEnum.Mined,
          txData: {
            gasPrice: BigNumber.from(
              txReceiptData.effectiveGasPrice || 0,
            ).toString(),
            blockNumber: txReceiptData.blockNumber,
            minedAt: new Date(txReceiptData.timestamp),
          },
        });
      }
    }

    return;
  } catch (error) {
    server.log.error(error);
    return;
  }
};
