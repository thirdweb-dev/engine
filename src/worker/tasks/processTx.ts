import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { getSDK } from "../../../core/sdk/sdk";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { prisma } from "../../db/client";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const processTx = async () => {
  try {
    // Everything happens in a transaction to lock for the duration of processing
    await prisma.$transaction(
      async (pgtx) => {
        // Select a batch of transactions and lock the rows
        const txs = await getQueuedTxs({ pgtx });

        if (txs.length < env.MIN_TRANSACTION_TO_PROCESS) {
          return;
        }

        // Transaction processing needs to happen sequentially for nonce management
        for (const tx of txs) {
          try {
            logger.worker.info(
              `[Transaction] [${tx.queueId}] Picked up by worker`,
            );

            // Update database that transaction has been picked up by worker
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Processed,
            });

            const sdk = await getSDK(
              tx.chainId!.toString(),
              tx.fromAddress!,
              pgtx,
            );

            // Run data gathering async calls in parallel
            const [mempoolNonce, dbNonce, gasOverrides] = await Promise.all([
              sdk.wallet.getNonce("pending"),
              getWalletNonce({
                pgtx,
                address: tx.fromAddress!,
                chainId: tx.chainId!,
              }),
              getDefaultGasOverrides(sdk.getProvider()),
            ]);

            // As a backstop, take the greater value between the mempool nonce and db nonce (in case we get out of sync)
            const nonce = BigNumber.from(mempoolNonce).gt(
              BigNumber.from(dbNonce?.nonce || 0),
            )
              ? BigNumber.from(mempoolNonce)
              : BigNumber.from(dbNonce?.nonce || 0);

            let res: ethers.providers.TransactionResponse;
            try {
              res = await sdk.getSigner()!.sendTransaction({
                to: tx.toAddress!,
                from: tx.fromAddress!,
                data: tx.data!,
                value: tx.value!,
                nonce,
                ...gasOverrides,
              });
            } catch (err: any) {
              logger.worker.warn(
                `[Transaction] [${tx.queueId}] Failed to send with error - ${err}`,
              );

              await updateTx({
                pgtx,
                queueId: tx.queueId!,
                status: TransactionStatusEnum.Errored,
                txData: {
                  errorMessage:
                    err?.message ||
                    err?.toString() ||
                    `Failed to handle transaction`,
                },
              });

              // TODO: If the transaction errors, we should move onto the next one
              continue;
            }

            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Submitted,
              res,
              txData: {
                sentAtBlockNumber: await sdk.getProvider().getBlockNumber(),
              },
            });

            logger.worker.info(
              `[Transaction] [${tx.queueId}] Submitted with nonce '${nonce}' & hash '${res.hash}'`,
            );

            // Increment the nonce used for the transaction and update the database
            await updateWalletNonce({
              pgtx,
              address: tx.fromAddress!,
              chainId: tx.chainId!,
              nonce: nonce.toNumber() + 1,
            });
          } catch (err) {
            logger.worker.warn(
              `[Transaction] [${tx.queueId}] Failed to process with error - ${err}`,
            );

            // TODO: Since this is an unknown error, it should be updated to unprocessed and retried if tx hasn't been sent.
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Errored,
              txData: {
                // TODO: Do we want more visibility on this error message? This case should rarely get hit.
                errorMessage: `Failed to process transaction.`,
              },
            });
          }
        }
      },
      {
        // Maximum 3 minutes to send the batch of transactions.
        // TODO: Should be dynamic with the batch size.
        timeout: 5 * 60000,
      },
    );
  } catch (err: any) {
    logger.worker.error(
      `Failed to process batch of transactions with error - ${err}`,
    );
  }
};
