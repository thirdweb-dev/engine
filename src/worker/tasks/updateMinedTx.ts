import { Transactions } from "@prisma/client";
import { getBlock } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { getSentTxs } from "../../db/transactions/getSentTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { logger } from "../../utils/logger";

export const updateMinedTx = async () => {
  try {
    const txs = await getSentTxs();

    if (txs.length === 0) {
      return;
    }

    const txsWithReceipts = (
      await Promise.all(
        txs.map(async (tx) => {
          const sdk = await getSdk({ chainId: tx.chainId! });
          const receipt: ethers.providers.TransactionReceipt | undefined =
            await sdk.getProvider().getTransactionReceipt(tx.transactionHash!);

          if (!receipt) {
            // If no receipt was received, return undefined to filter out tx
            return undefined;
          }

          // Get the timestamp when the transaction was mined
          const minedAt = new Date(
            (
              await getBlock({
                block: receipt.blockNumber,
                network: sdk.getProvider(),
              })
            ).timestamp * 1000,
          );

          return {
            tx,
            receipt,
            minedAt,
          };
        }),
      )
    ).filter((txWithReceipt) => {
      // Filter out transactions with no receipt to be picked up by a future worker
      return !!txWithReceipt;
    }) as {
      tx: Transactions;
      receipt: ethers.providers.TransactionReceipt;
      minedAt: Date;
    }[];

    // Update all transactions with a receipt in parallel
    await Promise.all(
      txsWithReceipts.map(async (txWithReceipt) => {
        await updateTx({
          queueId: txWithReceipt.tx.id,
          status: TransactionStatusEnum.Mined,
          txData: {
            gasPrice: txWithReceipt.receipt.effectiveGasPrice.toString(),
            blockNumber: txWithReceipt.receipt.blockNumber,
            minedAt: txWithReceipt.minedAt,
          },
        });

        logger.worker.info(
          `[Transaction] [${txWithReceipt.tx.id}] Updated with receipt`,
        );
      }),
    );
  } catch (err) {
    logger.worker.error(`Failed to update receipts with error - ${err}`);
    return;
  }
};
