import { BigNumber } from "ethers/lib/ethers";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { getSentTxs } from "../../db/transactions/getSentTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { logger } from "../../utils/logger";
import { getTransactionReceiptWithBlockDetails } from "./getTxReceipt";

export const updateMinedTx = async () => {
  try {
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
