import { Transactions } from "@prisma/client";
import { getBlock } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getSentTxs } from "../../db/transactions/getSentTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatus } from "../../server/schemas/transaction";
import { cancelTransactionAndUpdate } from "../../server/utils/transaction";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import {
  ReportUsageParams,
  UsageEventTxActionEnum,
  reportUsage,
} from "../../utils/usage";
import { WebhookData, sendWebhooks } from "../../utils/webhook";

const MEMPOOL_DURATION_TIMEOUT_MS = 1000 * 60 * 60;

export const updateMinedTx = async () => {
  try {
    const sendWebhookForQueueIds: WebhookData[] = [];
    const reportUsageForQueueIds: ReportUsageParams[] = [];
    await prisma.$transaction(
      async (pgtx) => {
        const txs = await getSentTxs({ pgtx });
        if (txs.length === 0) {
          return;
        }

        const droppedTxs: (Transactions & { provider?: string })[] = [];

        const txsWithReceipts = (
          await Promise.all(
            txs.map(async (tx) => {
              const sdk = await getSdk({ chainId: parseInt(tx.chainId!) });
              const provider =
                sdk.getProvider() as ethers.providers.JsonRpcProvider;

              const receipt: ethers.providers.TransactionReceipt | undefined =
                await provider.getTransactionReceipt(tx.transactionHash!);

              if (!receipt) {
                // This tx is not yet mined or was dropped.

                // Cancel transactions submitted over 1 hour ago.
                // @TODO: move duration to config
                const sentAt = new Date(tx.sentAt!);
                const ageInMilliseconds = Date.now() - sentAt.getTime();
                if (ageInMilliseconds > MEMPOOL_DURATION_TIMEOUT_MS) {
                  await cancelTransactionAndUpdate({
                    queueId: tx.id,
                    pgtx,
                  });

                  sendWebhookForQueueIds.push({
                    queueId: tx.id,
                    status: TransactionStatus.Cancelled,
                  });

                  reportUsageForQueueIds.push({
                    input: {
                      fromAddress: tx.fromAddress || undefined,
                      toAddress: tx.toAddress || undefined,
                      value: tx.value || undefined,
                      chainId: tx.chainId || undefined,
                      transactionHash: tx.transactionHash || undefined,
                      provider: provider.connection.url || undefined,
                      msSinceSend: Date.now() - tx.sentAt!.getTime(),
                    },
                    action: UsageEventTxActionEnum.CancelTx,
                  });
                }
                return;
              }

              const response = (await provider.getTransaction(
                tx.transactionHash!,
              )) as ethers.providers.TransactionResponse | null;

              // Get the timestamp when the transaction was mined. Fall back to curent time.
              const block = await getBlock({
                block: receipt.blockNumber,
                network: provider,
              });
              if (!block) {
                logger({
                  service: "worker",
                  level: "warn",
                  queueId: tx.id,
                  message: `Block not found (provider=${provider.connection.url}).`,
                });
              }
              const minedAt = block
                ? new Date(block.timestamp * 1000)
                : new Date();

              return {
                tx,
                receipt,
                response,
                minedAt,
                provider: provider.connection.url,
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
          provider: string;
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

            reportUsageForQueueIds.push({
              input: {
                fromAddress: txWithReceipt.tx.fromAddress || undefined,
                toAddress: txWithReceipt.tx.toAddress || undefined,
                value: txWithReceipt.tx.value || undefined,
                chainId: txWithReceipt.tx.chainId || undefined,
                transactionHash: txWithReceipt.tx.transactionHash || undefined,
                onChainTxStatus: txWithReceipt.receipt.status,
                functionName: txWithReceipt.tx.functionName || undefined,
                extension: txWithReceipt.tx.extension || undefined,
                provider: txWithReceipt.provider || undefined,
                msSinceSend:
                  txWithReceipt.minedAt.getTime() -
                  txWithReceipt.tx.sentAt!.getTime(),
              },
              action: UsageEventTxActionEnum.MineTx,
            });
          }),
        );
      },
      {
        timeout: 5 * 60000,
      },
    );

    await sendWebhooks(sendWebhookForQueueIds);
    reportUsage(reportUsageForQueueIds);
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
