import { Static } from "@sinclair/typebox";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { uuid } from "uuidv4";
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

        const workerId = uuid();
        logger.worker.error(
          `[ID: ${workerId}] Picked up ${txs.length} operations.`,
        );

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

          // logger.worker.info(
          //   `[Transaction] [${tx.queueId}] Picked up by worker`,
          // );

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

        logger.worker.error(
          `[ID: ${workerId}] Sorted into ${userOpsToSend.length} user ops & ${txsToSend.length} transactions.`,
        );

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
          const [walletAddress, chainId] = [
            key.split("-")[0],
            parseInt(key.split("-")[1]),
          ];

          logger.worker.error(
            `[ID: ${workerId}] Processing ${txsToSend.length} txs for ${walletAddress} on chain ${chainId}`,
          );

          const sdk = await getSdk({
            pgtx,
            chainId,
            walletAddress,
          });

          const [mempoolNonceData, dbNonceData, gasOverrides] =
            await Promise.all([
              sdk.wallet.getNonce("pending"),
              getWalletNonce({
                pgtx,
                chainId,
                address: walletAddress,
              }),
              getDefaultGasOverrides(sdk.getProvider()),
            ]);

          if (!dbNonceData) {
            logger.worker.error(
              `Could not find nonce or details for wallet ${walletAddress} on chain ${chainId}`,
            );
          }

          const mempoolNonce = BigNumber.from(mempoolNonceData);
          const dbNonce = BigNumber.from(dbNonceData?.nonce || 0);

          logger.worker.error(
            `[ID: ${workerId}] DB Nonce: ${dbNonce}; Mempool Nonce: ${mempoolNonce}`,
          );

          // As a backstop, take the greater value between the mempool nonce and db nonce (in case we get out of sync)
          let startNonce: BigNumber;
          if (mempoolNonce.gt(dbNonce)) {
            await updateWalletNonce({
              pgtx,
              chainId,
              address: walletAddress,
              nonce: mempoolNonce.toNumber(),
            });

            startNonce = mempoolNonce;
          } else {
            startNonce = dbNonce;
          }

          let incrementNonce = 0;

          logger.worker.error(
            `[ID: ${workerId}] Starting with nonce ${startNonce}.`,
          );

          // First just send or receive error for all transactions in sequence, and then update the database
          type SentTxStatus =
            | {
                status: TransactionStatusEnum.Submitted;
                queueId: string;
                res: ethers.providers.TransactionResponse;
                sentAtBlockNumber: number;
              }
            | {
                status: TransactionStatusEnum.Errored;
                queueId: string;
                errorMessage: string;
              };

          const txStatuses: SentTxStatus[] = [];
          for (const i in txsToSend) {
            const tx = txsToSend[i];

            // Optimistically increment nonce for each subsequent transaction
            const nonce = startNonce.add(i);

            try {
              logger.worker.info(
                `[Transaction] [${tx.queueId}] Sending with nonce '${nonce}'`,
              );
              const res = await sdk.getSigner()!.sendTransaction({
                to: tx.toAddress!,
                from: tx.fromAddress!,
                data: tx.data!,
                value: tx.value!,
                nonce,
                ...gasOverrides,
              });

              logger.worker.info(
                `[Transaction] [${tx.queueId}] Submitted with nonce '${nonce}' & hash '${res.hash}'`,
              );

              // Keep track of the number of transactions that went through successfully
              incrementNonce++;
              txStatuses.push({
                status: TransactionStatusEnum.Submitted,
                queueId: tx.queueId!,
                res,
                sentAtBlockNumber: await sdk.getProvider().getBlockNumber(),
              });
            } catch (err: any) {
              logger.worker.warn(
                `[Transaction] [${tx.queueId}] [Nonce: ${nonce}] Failed to send with error - ${err}`,
              );

              txStatuses.push({
                status: TransactionStatusEnum.Errored,
                queueId: tx.queueId!,
                errorMessage:
                  err?.message ||
                  err?.toString() ||
                  `Failed to handle transaction`,
              });
            }
          }

          await Promise.all(
            txStatuses.map(async (tx) => {
              switch (tx.status) {
                case TransactionStatusEnum.Submitted:
                  await updateTx({
                    pgtx,
                    queueId: tx.queueId,
                    status: TransactionStatusEnum.Submitted,
                    res: tx.res,
                    txData: {
                      sentAtBlockNumber: await sdk
                        .getProvider()
                        .getBlockNumber(),
                    },
                  });
                  break;
                case TransactionStatusEnum.Errored:
                  await updateTx({
                    pgtx,
                    queueId: tx.queueId,
                    status: tx.status,
                    txData: {
                      errorMessage: tx.errorMessage,
                    },
                  });
                  break;
              }
            }),
          );

          logger.worker.error(
            `[ID: ${workerId}] Updating nonce by ${incrementNonce}.`,
          );

          await updateWalletNonce({
            pgtx,
            address: walletAddress,
            chainId,
            nonce: startNonce.toNumber() + incrementNonce,
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
            logger.worker.error(
              `[ID: ${workerId}] Sending user operation ${userOpHash}.`,
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
