import { Transactions } from "@prisma/client";
import { getBlock } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getSentTxs } from "../../db/transactions/getSentTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";

export const updateMinedTx = async () => {
  try {
    await prisma.$transaction(
      async (pgtx) => {
        const txs = await getSentTxs({ pgtx });

        if (txs.length === 0) {
          return;
        }

        const txsWithReceipts = (
          await Promise.all(
            txs.map(async (tx) => {
              const sdk = await getSdk({ chainId: parseInt(tx.chainId!) });
              const receipt: ethers.providers.TransactionReceipt | undefined =
                await sdk
                  .getProvider()
                  .getTransactionReceipt(tx.transactionHash!);

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
              pgtx,
              queueId: txWithReceipt.tx.id,
              data: {
                status: TransactionStatusEnum.Mined,
                gasPrice: txWithReceipt.receipt.effectiveGasPrice.toString(),
                blockNumber: txWithReceipt.receipt.blockNumber,
                minedAt: txWithReceipt.minedAt,
                onChainTxStatus: txWithReceipt.receipt.status,
              },
            });

            logger.worker.info(
              `[Transaction] [${txWithReceipt.tx.id}] Updated with receipt`,
            );
          }),
        );
      },
      {
        timeout: 5 * 60000,
      },
    );
  } catch (err) {
    logger.worker.error(err);
    return;
  }
};
