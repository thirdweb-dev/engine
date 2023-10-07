import { Static } from "@sinclair/typebox";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers/lib/ethers";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../../../server/schemas/transaction";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { checkIfIDCancelled } from "../../db/cancelledTransactions/checkIfTxCancelled";
import { updateCancelStatus } from "../../db/cancelledTransactions/updateCancelStatus";
import { prisma } from "../../db/client";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { randomNonce } from "../utils/nonce";

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

        const txsToSend = [];
        const userOpsToSend = [];

        for (const tx of txs) {
          // We check for cancellation at the beginning of the batch
          const cancelled = await checkIfIDCancelled({
            queueId: tx.queueId!,
          });

          if (cancelled) {
            logger.worker.info(
              `[Transaction] [${tx.queueId}] Cancelled by user`,
            );

            if (!cancelled.cancelledByWorkerAt) {
              await updateCancelStatus({
                queueId: tx.queueId!,
              });
            }

            continue;
          }

          logger.worker.info(
            `[Transaction] [${tx.queueId}] Picked up by worker`,
          );

          // Update database that transaction has been picked up by worker
          await updateTx({
            pgtx,
            queueId: tx.queueId!,
            status: TransactionStatusEnum.Processed,
          });

          if (tx.accountAddress && tx.signerAddress) {
            userOpsToSend.push(tx);
          } else {
            txsToSend.push(tx);
          }
        }

        // Group transactions to be batched by from address & chain id
        const txsByWallet = txsToSend.reduce((acc, curr) => {
          const key = `${curr.fromAddress}-${curr.chainId}`;
          if (key in acc) {
            acc[key].push(curr);
          } else {
            acc[key] = [curr];
          }

          return acc;
        }, {} as Record<string, Static<typeof transactionResponseSchema>[]>);

        const sentTxs = Object.keys(txsByWallet).map(async (key) => {
          const txsToSend = txsByWallet[key];
          const idTx = txsToSend[0];

          const sdk = await getSdk({
            pgtx,
            chainId: idTx.chainId!,
            walletAddress: idTx.fromAddress!,
          });

          const [mempoolNonce, dbNonce, gasOverrides] = await Promise.all([
            sdk.wallet.getNonce("pending"),
            getWalletNonce({
              pgtx,
              address: idTx.fromAddress!,
              chainId: idTx.chainId!,
            }),
            getDefaultGasOverrides(sdk.getProvider()),
          ]);

          // As a backstop, take the greater value between the mempool nonce and db nonce (in case we get out of sync)
          const nonce = BigNumber.from(mempoolNonce).gt(
            BigNumber.from(dbNonce?.nonce || 0),
          )
            ? BigNumber.from(mempoolNonce)
            : BigNumber.from(dbNonce?.nonce || 0);

          let incrementNonce = 0;

          await Promise.all(
            txsToSend.map(async (tx, i) => {
              let res;
              try {
                res = await sdk.getSigner()!.sendTransaction({
                  to: tx.toAddress!,
                  from: tx.fromAddress!,
                  data: tx.data!,
                  value: tx.value!,
                  // Increment nonce optimistically
                  nonce: nonce.add(i),
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

                return;
              }

              incrementNonce++;
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
            }),
          );

          await updateWalletNonce({
            pgtx,
            address: idTx.fromAddress!,
            chainId: idTx.chainId!,
            nonce: nonce.toNumber() + incrementNonce,
          });
        });

        const sentUserOps = userOpsToSend.map(async (tx) => {
          const signer = (
            await getSdk({
              pgtx,
              chainId: tx.chainId!,
              walletAddress: tx.signerAddress!,
              accountAddress: tx.accountAddress!,
            })
          ).getSigner() as ERC4337EthersSigner;

          const nonce = randomNonce();
          try {
            const userOp = await signer.smartAccountAPI.createSignedUserOp(
              {
                target: tx.target || "",
                data: tx.data || "0x",
                value: tx.value ? BigNumber.from(tx.value) : undefined,
                nonce,
              },
              false,
            );
            const userOpHash = await signer.smartAccountAPI.getUserOpHash(
              userOp,
            );
            await signer.httpRpcClient.sendUserOpToBundler(userOp);

            // TODO: Need to update with other user op data
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              status: TransactionStatusEnum.UserOpSent,
              txData: {
                userOpHash,
              },
            });
          } catch (err: any) {
            logger.worker.warn(
              `[User Operation] [${tx.queueId}] Failed to send with error - ${err}`,
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
          }
        });

        await Promise.all([...sentTxs, ...sentUserOps]);
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
