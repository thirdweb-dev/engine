import { Transactions } from "@prisma/client";
import { getBlock } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getSentTxs } from "../../db/transactions/getSentTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatus } from "../../server/schemas/transaction";
import { WebhookData, sendWebhooks } from "../../server/utils/webhook";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";

export const updateMinedTx = async () => {
  try {
    const sendWebhookForQueueIds: WebhookData[] = [];
    await prisma.$transaction(
      async (pgtx) => {
        const txs = await getSentTxs({ pgtx });

        if (txs.length === 0) {
          return;
        }

        const droppedTxs: Transactions[] = [];

        const txsWithReceipts = (
          await Promise.all(
            txs.map(async (tx) => {
              const sdk = await getSdk({ chainId: parseInt(tx.chainId!) });
              const receipt: ethers.providers.TransactionReceipt | undefined =
                await sdk
                  .getProvider()
                  .getTransactionReceipt(tx.transactionHash!);

              if (!receipt) {
                // This tx is not yet mined or was dropped.

                // If the tx was submitted over 1 hour ago, assume it is dropped.
                // @TODO: move duration to config
                const sentAt = new Date(tx.sentAt!);
                const ageInMilliseconds = Date.now() - sentAt.getTime();
                if (ageInMilliseconds > 1000 * 60 * 60 * 1) {
                  droppedTxs.push(tx);
                }
                return;
              }

              const response = (await sdk
                .getProvider()
                .getTransaction(
                  tx.transactionHash!,
                )) as ethers.providers.TransactionResponse | null;

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
                response,
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
          response: ethers.providers.TransactionResponse;
          minedAt: Date;
        }[];

        // Update mined transactions.
        await Promise.all(
          txsWithReceipts.map(async (txWithReceipt) => {
            await updateTx({
              pgtx,
              queueId: txWithReceipt.tx.id,
              data: {
                status: TransactionStatus.Mined,
                minedAt: txWithReceipt.minedAt,
                blockNumber: txWithReceipt.receipt.blockNumber,
                onChainTxStatus: txWithReceipt.receipt.status,
                transactionHash: txWithReceipt.receipt.transactionHash,
                transactionType: txWithReceipt.receipt.type,
                gasPrice: txWithReceipt.receipt.effectiveGasPrice.toString(),
                gasLimit: txWithReceipt.response?.gasLimit?.toString(),
                maxFeePerGas: txWithReceipt.response?.maxFeePerGas?.toString(),
                maxPriorityFeePerGas:
                  txWithReceipt.response?.maxPriorityFeePerGas?.toString(),
                nonce: txWithReceipt.response?.nonce,
              },
            });

            logger({
              service: "worker",
              level: "info",
              queueId: txWithReceipt.tx.id,
              message: "Updated mined tx.",
            });

            sendWebhookForQueueIds.push({
              queueId: txWithReceipt.tx.id,
              status: TransactionStatus.Mined,
            });
          }),
        );

        // Update dropped txs.
        await Promise.all(
          droppedTxs.map(async (tx) => {
            await updateTx({
              pgtx,
              queueId: tx.id,
              data: {
                status: TransactionStatus.Errored,
                errorMessage: "Transaction timed out.",
              },
            });

            logger({
              service: "worker",
              level: "info",
              queueId: tx.id,
              message: "Update dropped tx.",
            });

            sendWebhookForQueueIds.push({
              queueId: tx.id,
              status: TransactionStatus.Errored,
            });
          }),
        );
      },
      {
        timeout: 5 * 60000,
      },
    );

    await sendWebhooks(sendWebhookForQueueIds);
  } catch (err) {
    logger({
      service: "worker",
      level: "error",
      message: `Failed to update mined transactions`,
      error: err,
    });
    return;
  }
};
