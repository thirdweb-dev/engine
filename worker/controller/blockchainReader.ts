import { BigNumber } from "ethers";
import { env } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getSentTxs } from "../../src/db/transactions/getSentTxs";
import { updateTx } from "../../src/db/transactions/updateTx";
import { logger } from "../../src/utils/logger";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";

const MINED_TX_CRON_ENABLED = env.MINED_TX_CRON_ENABLED;

export const checkForMinedTransactionsOnBlockchain = async () => {
  try {
    if (!MINED_TX_CRON_ENABLED) {
      logger.worker.warn("Mined Tx Cron is disabled");
      return;
    }
    logger.worker.info(
      "Running Cron to check for mined transactions on blockchain",
    );
    const transactions = await getSentTxs();

    if (transactions.length === 0) {
      logger.worker.warn("No transactions to check for mined status");
      return;
    }

    const txReceiptsWithChainId = await getTransactionReceiptWithBlockDetails(
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
        logger.worker.info(
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
    logger.worker.error(error);
    return;
  }
};
