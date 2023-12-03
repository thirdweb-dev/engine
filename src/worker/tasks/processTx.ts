import { Static } from "@sinclair/typebox";
import {
  StaticJsonRpcBatchProvider,
  getDefaultGasOverrides,
} from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { RpcResponse } from "viem/_types/utils/rpc";
import { prisma } from "../../db/client";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { WalletBalanceWebhookSchema } from "../../schema/webhooks";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { sendBalanceWebhook, sendTxWebhook } from "../../server/utils/webhook";
import { getSdk } from "../../utils/cache/getSdk";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { randomNonce } from "../utils/nonce";

type SentTxStatus =
  | {
      transactionHash: string;
      status: TransactionStatusEnum.Submitted;
      queueId: string;
      res: ethers.providers.TransactionResponse | null;
      sentAtBlockNumber: number;
    }
  | {
      status: TransactionStatusEnum.Errored;
      queueId: string;
      errorMessage: string;
    };

export const processTx = async () => {
  try {
    // 0. Initialize queueIds to send webhook
    const sendWebhookForQueueIds: string[] = [];
    await prisma.$transaction(
      async (pgtx) => {
        // 1. Select a batch of transactions and lock the rows so no other workers pick them up
        const txs = await getQueuedTxs({ pgtx });

        const config = await getConfiguration();
        if (txs.length < config.minTxsToProcess) {
          return;
        }
        // Send Queued Webhook
        await sendTxWebhook(txs.map((tx) => tx.queueId!));

        // 2. Iterate through all filtering cancelled trandsactions, and sorting transactions and user operations
        const txsToSend = [];
        const userOpsToSend = [];
        for (const tx of txs) {
          if (tx.cancelledAt) {
            logger.worker.info(
              `[Transaction] [${tx.queueId}] Cancelled by user`,
            );
            continue;
          }
          logger.worker.info(
            `[Transaction] [${tx.queueId}] Picked up by worker`,
          );

          await updateTx({
            pgtx,
            queueId: tx.queueId!,
            data: {
              status: TransactionStatusEnum.Processed,
            },
          });

          if (tx.accountAddress && tx.signerAddress) {
            userOpsToSend.push(tx);
          } else {
            txsToSend.push(tx);
          }
        }

        // 3. Group transactions to be batched by sender address & chain id
        const txsByWallet = txsToSend.reduce((acc, curr) => {
          const key = `${curr.fromAddress}-${curr.chainId}`;
          if (key in acc) {
            acc[key].push(curr);
          } else {
            acc[key] = [curr];
          }

          return acc;
        }, {} as Record<string, Static<typeof transactionResponseSchema>[]>);

        // 4. Sending transaction batches in parallel by unique wallet address and chain id
        const sentTxs = Object.keys(txsByWallet).map(async (key) => {
          const txsToSend = txsByWallet[key];
          const [walletAddress, chainId] = [
            key.split("-")[0],
            parseInt(key.split("-")[1]),
          ];

          const sdk = await getSdk({
            pgtx,
            chainId,
            walletAddress,
          });

          const [signer, provider] = await Promise.all([
            sdk.getSigner(),
            sdk.getProvider() as StaticJsonRpcBatchProvider,
          ]);

          if (!signer || !provider) {
            return;
          }

          // - For each wallet address, check the nonce in database and the mempool
          const [walletBalance, mempoolNonceData, dbNonceData, gasOverrides] =
            await Promise.all([
              sdk.wallet.balance(),
              sdk.wallet.getNonce("pending"),
              getWalletNonce({
                pgtx,
                chainId,
                address: walletAddress,
              }),
              getDefaultGasOverrides(provider),
            ]);

          // Wallet Balance Webhook
          if (
            BigNumber.from(walletBalance.value).lte(
              BigNumber.from(config.minWalletBalance),
            )
          ) {
            const message =
              "Wallet balance is below minimum threshold. Please top up your wallet.";
            const walletBalanceData: WalletBalanceWebhookSchema = {
              walletAddress,
              minimumBalance: ethers.utils.formatEther(config.minWalletBalance),
              currentBalance: walletBalance.displayValue,
              chainId,
              message,
            };

            await sendBalanceWebhook(walletBalanceData);

            logger.worker.warn(
              `[Low Wallet Balance] [${walletAddress}]: ` + message,
            );
          }

          if (!dbNonceData) {
            logger.worker.error(
              `Could not find nonce or details for wallet ${walletAddress} on chain ${chainId}`,
            );
          }

          // - Take the larger of the nonces, and update database nonce to mepool value if mempool is greater
          let startNonce: BigNumber;
          const mempoolNonce = BigNumber.from(mempoolNonceData);
          const dbNonce = BigNumber.from(dbNonceData?.nonce || 0);
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

          // Group all transactions into a single batch rpc request
          let i = 0;
          const rpcRequests = [];
          const preparedTxs: typeof txsToSend = [];
          for (const tx of txsToSend) {
            const nonce = startNonce.add(i);

            try {
              const txRequest = await signer.populateTransaction({
                to: tx.toAddress!,
                from: tx.fromAddress!,
                data: tx.data!,
                value: tx.value!,
                nonce,
                ...gasOverrides,
              });
              const signature = await signer.signTransaction(txRequest);

              rpcRequests.push({
                id: i,
                jsonrpc: "2.0",
                method: "eth_sendRawTransaction",
                params: [signature],
              });

              preparedTxs.push(tx);

              i++;
            } catch (err: any) {
              logger.worker.warn(
                `[Transaction] [${
                  tx.queueId
                }] Failed to send transaction with error - ${
                  err?.message || err
                }`,
              );

              await updateTx({
                pgtx,
                queueId: tx.queueId!,
                data: {
                  status: TransactionStatusEnum.Errored,
                  errorMessage:
                    err?.message ||
                    err?.toString() ||
                    `Failed to handle transaction`,
                },
              });
              sendWebhookForQueueIds.push(tx.queueId!);
            }
          }

          // Send all the transactions as one batch request
          let rpcResponses: RpcResponse[] = [];
          if (rpcRequests.length > 0) {
            const res = await fetch(provider.connection.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(provider.connection.url.includes("rpc.thirdweb.com")
                  ? {
                      "x-secret-key": env.THIRDWEB_API_SECRET_KEY,
                    }
                  : {}),
              },
              body: JSON.stringify(rpcRequests),
            });
            rpcResponses = await res.json();
          }

          // Check how many transactions succeeded and increment nonce
          const incrementNonce = rpcResponses.reduce((acc, curr) => {
            return curr.result && !curr.error ? acc + 1 : acc;
          }, 0);

          await updateWalletNonce({
            pgtx,
            address: walletAddress,
            chainId,
            nonce: startNonce.toNumber() + incrementNonce,
          });

          // Update transaction records with updated data
          const txStatuses: SentTxStatus[] = await Promise.all(
            rpcResponses.map(async (rpcRes, i) => {
              const tx = preparedTxs[i];
              if (rpcRes.result) {
                const txHash = rpcRes.result;

                const txRes = (await provider.getTransaction(
                  txHash,
                )) as ethers.providers.TransactionResponse | null;

                logger.worker.info(
                  `[Transaction] [${tx.queueId}] Sent transaction with hash ${txHash}`,
                );

                if (!!txRes) {
                  logger.worker.debug(
                    `[Transaction] [${tx.queueId}] Using nonce ${txRes.nonce}`,
                  );
                }

                return {
                  transactionHash: txHash,
                  status: TransactionStatusEnum.Submitted,
                  queueId: tx.queueId!,
                  res: txRes,
                  sentAtBlockNumber: await provider.getBlockNumber(),
                };
              } else {
                logger.worker.warn(
                  `[Transaction] [${
                    tx.queueId
                  }] Failed to send with error - ${JSON.stringify(
                    rpcRes.error,
                  )}`,
                );

                return {
                  status: TransactionStatusEnum.Errored,
                  queueId: tx.queueId!,
                  errorMessage:
                    rpcRes.error?.message ||
                    rpcRes.error?.toString() ||
                    `Failed to handle transaction`,
                };
              }
            }),
          );

          // - After sending transactions, update database for each transaction
          await Promise.all(
            txStatuses.map(async (tx) => {
              switch (tx.status) {
                case TransactionStatusEnum.Submitted:
                  await updateTx({
                    pgtx,
                    queueId: tx.queueId,
                    data: {
                      status: TransactionStatusEnum.Submitted,
                      transactionHash: tx.transactionHash,
                      res: tx.res,
                      sentAtBlockNumber: await provider.getBlockNumber(),
                    },
                  });
                  break;
                case TransactionStatusEnum.Errored:
                  await updateTx({
                    pgtx,
                    queueId: tx.queueId,
                    data: {
                      status: TransactionStatusEnum.Errored,
                      errorMessage: tx.errorMessage,
                    },
                  });
                  break;
              }
              sendWebhookForQueueIds.push(tx.queueId!);
            }),
          );
        });

        // 5. Send all user operations in parallel with multi-dimensional nonce
        const sentUserOps = userOpsToSend.map(async (tx) => {
          const signer = (
            await getSdk({
              pgtx,
              chainId: parseInt(tx.chainId!),
              walletAddress: tx.signerAddress!,
              accountAddress: tx.accountAddress!,
            })
          ).getSigner() as ERC4337EthersSigner;

          const nonce = randomNonce();
          try {
            const userOp = await signer.smartAccountAPI.createSignedUserOp({
              target: tx.target || "",
              data: tx.data || "0x",
              value: tx.value ? BigNumber.from(tx.value) : undefined,
              nonce,
            });
            const userOpHash = await signer.smartAccountAPI.getUserOpHash(
              userOp,
            );
            await signer.httpRpcClient.sendUserOpToBundler(userOp);

            // TODO: Need to update with other user op data
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              data: {
                status: TransactionStatusEnum.UserOpSent,
                userOpHash,
              },
            });
            sendWebhookForQueueIds.push(tx.queueId!);
          } catch (err: any) {
            logger.worker.warn(
              `[User Operation] [${tx.queueId}] Failed to send with error - ${err}`,
            );
            await updateTx({
              pgtx,
              queueId: tx.queueId!,
              data: {
                status: TransactionStatusEnum.Errored,
                errorMessage:
                  err?.message ||
                  err?.toString() ||
                  `Failed to handle transaction`,
              },
            });
            sendWebhookForQueueIds.push(tx.queueId!);
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

    await sendTxWebhook(sendWebhookForQueueIds);
  } catch (err: any) {
    logger.worker.error(
      `Failed to process batch of transactions with error - ${err}`,
    );
  }
};
