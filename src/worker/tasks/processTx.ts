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
import { getWithdrawalValue } from "../utils/withdraw";

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
            logger({
              service: "worker",
              level: "info",
              queueId: tx.queueId,
              message: `Cancelled by user`,
            });
            continue;
          }

          logger({
            service: "worker",
            level: "info",
            queueId: tx.queueId,
            message: `Picked up by worker`,
          });

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

          try {
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
                minimumBalance: ethers.utils.formatEther(
                  config.minWalletBalance,
                ),
                currentBalance: walletBalance.displayValue,
                chainId,
                message,
              };

              await sendBalanceWebhook(walletBalanceData);

              logger({
                service: "worker",
                level: "warn",
                message: `[Low Wallet Balance] [${walletAddress}] ${message}`,
              });
            }

            if (!dbNonceData) {
              logger({
                service: "worker",
                level: "error",
                message: `Could not find nonce for wallet ${walletAddress} on chain ${chainId}`,
              });
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
            let sentTxCount = 0;
            const rpcResponses: {
              queueId: string;
              tx: ethers.providers.TransactionRequest;
              res: RpcResponse;
            }[] = [];
            for (const tx of txsToSend) {
              const nonce = startNonce.add(sentTxCount);

              try {
                let value: ethers.BigNumberish = tx.value!;

                if (tx.extension === "withdraw") {
                  value = await getWithdrawalValue({
                    provider,
                    chainId,
                    fromAddress: tx.fromAddress!,
                    toAddress: tx.toAddress!,
                    gasOverrides,
                  });
                }

                const txRequest = await signer.populateTransaction({
                  to: tx.toAddress!,
                  from: tx.fromAddress!,
                  data: tx.data!,
                  value,
                  nonce,
                  ...gasOverrides,
                });

                // TODO: Add debug/trace level info on transaction info

                // TODO: We need to target specific cases
                // Bump gas limit to avoid occasional out of gas errors
                txRequest.gasLimit = txRequest.gasLimit
                  ? BigNumber.from(txRequest.gasLimit).mul(120).div(100)
                  : undefined;

                const signature = await signer.signTransaction(txRequest);

                logger({
                  service: "worker",
                  level: "debug",
                  queueId: tx.queueId,
                  message: `Sending transaction to ${provider.connection.url}`,
                });

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
                  body: JSON.stringify({
                    id: 0,
                    jsonrpc: "2.0",
                    method: "eth_sendRawTransaction",
                    params: [signature],
                  }),
                });
                const rpcResponse = (await res.json()) as RpcResponse;
                rpcResponses.push({
                  queueId: tx.queueId!,
                  tx: txRequest,
                  res: rpcResponse,
                });

                if (!rpcResponse.error && !!rpcResponse.result) {
                  sentTxCount++;
                }
              } catch (err: any) {
                logger({
                  service: "worker",
                  level: "warn",
                  queueId: tx.queueId,
                  message: `Failed to send`,
                  error: err,
                });

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

            // Check how many transactions succeeded and increment nonce
            const incrementNonce = rpcResponses.reduce((acc, curr) => {
              return curr.res.result && !curr.res.error ? acc + 1 : acc;
            }, 0);

            await updateWalletNonce({
              pgtx,
              address: walletAddress,
              chainId,
              nonce: startNonce.toNumber() + incrementNonce,
            });

            // Update transaction records with updated data
            const txStatuses: SentTxStatus[] = await Promise.all(
              rpcResponses.map(async ({ queueId, tx, res }) => {
                if (res.result) {
                  const txHash = res.result;
                  const txRes = (await provider.getTransaction(
                    txHash,
                  )) as ethers.providers.TransactionResponse | null;

                  logger({
                    service: "worker",
                    level: "info",
                    queueId,
                    message: `Sent transaction with hash '${txHash}' and nonce '${tx.nonce}'`,
                  });

                  return {
                    transactionHash: txHash,
                    status: TransactionStatusEnum.Submitted,
                    queueId: queueId,
                    res: txRes,
                    sentAtBlockNumber: await provider.getBlockNumber(),
                  };
                } else {
                  logger({
                    service: "worker",
                    level: "warn",
                    queueId,
                    message: `Failed to send`,
                    error: res.error,
                  });

                  return {
                    status: TransactionStatusEnum.Errored,
                    queueId: queueId,
                    errorMessage:
                      res.error?.message ||
                      res.error?.toString() ||
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
          } catch (err: any) {
            await Promise.all(
              txsToSend.map(async (tx) => {
                logger({
                  service: "worker",
                  level: "error",
                  queueId: tx.queueId,
                  message: `Failed to process batch of transactions for wallet '${walletAddress}' on chain '${chainId}'`,
                  error: err,
                });

                await updateTx({
                  pgtx,
                  queueId: tx.queueId!,
                  data: {
                    status: TransactionStatusEnum.Errored,
                    errorMessage: `[Worker] [Error] Failed to process batch of transactions for wallet - ${
                      err || err?.message
                    }`,
                  },
                });
              }),
            );
          }
        });

        // 5. Send all user operations in parallel with multi-dimensional nonce
        const sentUserOps = userOpsToSend.map(async (tx) => {
          try {
            const signer = (
              await getSdk({
                pgtx,
                chainId: parseInt(tx.chainId!),
                walletAddress: tx.signerAddress!,
                accountAddress: tx.accountAddress!,
              })
            ).getSigner() as ERC4337EthersSigner;

            const nonce = randomNonce();
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
            logger({
              service: "worker",
              level: "warn",
              queueId: tx.queueId,
              message: `Failed to send`,
              error: err,
            });

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
    logger({
      service: "worker",
      level: "error",
      message: `Failed to process batch of transactions`,
      error: err,
    });
  }
};
