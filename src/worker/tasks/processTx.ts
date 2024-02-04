/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Static } from "@sinclair/typebox";
import {
  StaticJsonRpcBatchProvider,
  getDefaultGasOverrides,
  toEther,
} from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { RpcResponse } from "viem/_types/utils/rpc";
import { prisma } from "../../db/client";
import { getQueuedTxs } from "../../db/transactions/getQueuedTxs";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { WalletBalanceWebhookSchema } from "../../schema/webhooks";
import {
  TransactionStatusEnum,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import {
  ReportUsageParams,
  UsageEventTxActionEnum,
  reportUsage,
} from "../../utils/usage";
import {
  WebhookData,
  sendBalanceWebhook,
  sendWebhooks,
} from "../../utils/webhook";
import { randomNonce } from "../utils/nonce";
import { getWithdrawalValue } from "../utils/withdraw";

type SentTxStatus =
  | {
      transactionHash: string;
      sentAt: Date;
      status: TransactionStatusEnum.Submitted;
      queueId: string;
      res: ethers.providers.TransactionResponse | null;
      sentAtBlockNumber: number;
      functionName?: string;
      extension?: string;
    }
  | {
      status: TransactionStatusEnum.Errored;
      queueId: string;
      errorMessage: string;
      txRequest: {
        from?: string;
        to?: string;
        value?: string;
        chainId?: string;
      };
      functionName?: string;
      extension?: string;
    };

type RpcResponseData = {
  queueId: string;
  tx: ethers.providers.TransactionRequest;
  res: RpcResponse;
  sentAt: Date;
  functionName?: string;
  extension?: string;
};

export const processTx = async () => {
  try {
    // 0. Initialize queueIds to send webhook
    const sendWebhookForQueueIds: WebhookData[] = [];
    const reportUsageForQueueIds: ReportUsageParams[] = [];
    await prisma.$transaction(
      async (pgtx) => {
        // 1. Select a batch of transactions and lock the rows so no other workers pick them up
        const txs = await getQueuedTxs({ pgtx });

        logger({
          service: "worker",
          level: "info",
          message: `Received ${txs.length} transactions to process`,
        });

        const config = await getConfig();
        if (txs.length < config.minTxsToProcess) {
          return;
        }
        // Send Queued Webhook
        await sendWebhooks(
          txs.map((tx) => ({
            queueId: tx.queueId!,
            status: TransactionStatusEnum.Queued,
          })),
        );

        await reportUsage(
          txs.map((tx) => ({
            input: {
              chainId: tx.chainId || undefined,
              fromAddress: tx.fromAddress || undefined,
              toAddress: tx.toAddress || undefined,
              value: tx.value || undefined,
              transactionHash: tx.transactionHash || undefined,
              functionName: tx.functionName || undefined,
              extension: tx.extension || undefined,
            },
            action: UsageEventTxActionEnum.QueueTx,
          })),
        );

        // 2. Iterate through all filtering cancelled trandsactions, and sorting transactions and user operations
        const txsToSend = [];
        const userOpsToSend = [];
        for (const tx of txs) {
          if (tx.cancelledAt) {
            logger({
              service: "worker",
              level: "info",
              queueId: tx.queueId,
              message: `Cancelled`,
            });
            continue;
          }

          logger({
            service: "worker",
            level: "info",
            queueId: tx.queueId,
            message: `Processing`,
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

            // Important: We need to block this worker until the nonce lock is acquired
            const dbNonceData = await getWalletNonce({
              pgtx,
              chainId,
              address: walletAddress,
            });

            // For each wallet address, check the nonce in database and the mempool
            const [walletBalance, mempoolNonceData, gasOverrides] =
              await Promise.all([
                sdk.wallet.balance(),
                sdk.wallet.getNonce("pending"),
                getDefaultGasOverrides(provider),
              ]);

            // Wallet balance webhook
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
                message: `[${walletAddress}] ${message}`,
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

            const rpcResponses: RpcResponseData[] = [];

            let txIndex = 0;
            let nonceIncrement = 0;

            while (txIndex < txsToSend.length) {
              const nonce = startNonce.add(nonceIncrement);
              const tx = txsToSend[txIndex];

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

                logger({
                  service: "worker",
                  level: "debug",
                  queueId: tx.queueId,
                  message: `Populated`,
                  data: {
                    nonce: txRequest.nonce?.toString(),
                    gasLimit: txRequest.gasLimit?.toString(),
                    gasPrice: txRequest.gasPrice
                      ? toEther(txRequest.gasPrice)
                      : undefined,
                    maxFeePerGas: txRequest.maxFeePerGas
                      ? toEther(txRequest.maxFeePerGas)
                      : undefined,
                    maxPriorityFeePerGas: txRequest.maxPriorityFeePerGas
                      ? toEther(txRequest.maxPriorityFeePerGas)
                      : undefined,
                  },
                });

                // TODO: We need to target specific cases
                // Bump gas limit to avoid occasional out of gas errors
                txRequest.gasLimit = txRequest.gasLimit
                  ? BigNumber.from(txRequest.gasLimit).mul(120).div(100)
                  : undefined;

                const signature = await signer.signTransaction(txRequest);
                const rpcRequest = {
                  id: 0,
                  jsonrpc: "2.0",
                  method: "eth_sendRawTransaction",
                  params: [signature],
                };

                logger({
                  service: "worker",
                  level: "debug",
                  queueId: tx.queueId,
                  message: `Sending to ${provider.connection.url}`,
                  data: rpcRequest,
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
                  body: JSON.stringify(rpcRequest),
                });
                const rpcResponse = (await res.json()) as RpcResponse;

                logger({
                  service: "worker",
                  level: "debug",
                  queueId: tx.queueId,
                  message: `Received response`,
                  data: rpcResponse,
                });

                if (!rpcResponse.error && !!rpcResponse.result) {
                  // Success (continue to next transaction)
                  nonceIncrement++;
                  txIndex++;

                  rpcResponses.push({
                    queueId: tx.queueId!,
                    tx: txRequest,
                    res: rpcResponse,
                    sentAt: new Date(),
                  });
                  sendWebhookForQueueIds.push({
                    queueId: tx.queueId!,
                    status: TransactionStatusEnum.Submitted,
                  });
                } else if (
                  typeof rpcResponse.error?.message === "string" &&
                  (rpcResponse.error.message as string)
                    .toLowerCase()
                    .includes("nonce too low")
                ) {
                  // Nonce too low (retry same transaction with higher nonce)
                  nonceIncrement++;
                } else {
                  // Error (continue to next transaction)
                  txIndex++;

                  rpcResponses.push({
                    queueId: tx.queueId!,
                    tx: txRequest,
                    res: rpcResponse,
                    sentAt: new Date(),
                    functionName: tx.functionName || undefined,
                    extension: tx.extension || undefined,
                  });
                  sendWebhookForQueueIds.push({
                    queueId: tx.queueId!,
                    status: TransactionStatusEnum.Errored,
                  });
                }
              } catch (err: any) {
                // Error (continue to next transaction)
                txIndex++;
                sendWebhookForQueueIds.push({
                  queueId: tx.queueId!,
                  status: TransactionStatusEnum.Errored,
                });
                reportUsageForQueueIds.push({
                  input: {
                    fromAddress: tx.fromAddress || undefined,
                    toAddress: tx.toAddress || undefined,
                    value: tx.value || undefined,
                    chainId: tx.chainId || undefined,
                    functionName: tx.functionName || undefined,
                    extension: tx.extension || undefined,
                  },
                  action: UsageEventTxActionEnum.NotSentTx,
                });

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
              }
            }

            await updateWalletNonce({
              pgtx,
              address: walletAddress,
              chainId,
              nonce: startNonce.add(nonceIncrement).toNumber(),
            });

            // Update transaction records with updated data
            const txStatuses: SentTxStatus[] = await Promise.all(
              rpcResponses.map(async ({ queueId, tx, res, sentAt }) => {
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
                    sentAt,
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
                    message: `Received error from RPC`,
                    error: res.error,
                  });

                  return {
                    status: TransactionStatusEnum.Errored,
                    queueId: queueId,
                    errorMessage:
                      res.error?.message ||
                      res.error?.toString() ||
                      `Failed to handle transaction`,
                    txRequest: {
                      from: tx.from,
                      to: tx.to,
                      value: tx.value?.toString(),
                      chainId: tx.chainId?.toString(),
                    },
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
                        sentAt: tx.sentAt,
                        status: TransactionStatusEnum.Submitted,
                        transactionHash: tx.transactionHash,
                        res: tx.res,
                        sentAtBlockNumber: await provider.getBlockNumber(),
                      },
                    });
                    reportUsageForQueueIds.push({
                      input: {
                        fromAddress: tx.res?.from,
                        toAddress: tx.res?.to,
                        value: tx.res?.value?.toString(),
                        chainId: tx.res?.chainId?.toString(),
                        transactionHash: tx.transactionHash,
                        functionName: tx.functionName || undefined,
                        extension: tx.extension || undefined,
                      },
                      action: UsageEventTxActionEnum.SentTx,
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
                    reportUsageForQueueIds.push({
                      input: {
                        fromAddress: tx.txRequest.from,
                        toAddress: tx.txRequest.to,
                        value: tx.txRequest.value?.toString(),
                        chainId: tx.txRequest.chainId?.toString(),
                        functionName: tx.functionName || undefined,
                        extension: tx.extension || undefined,
                      },
                      action: UsageEventTxActionEnum.NotSentTx,
                    });
                    break;
                }
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

                // Add to Webhook Queue to send updates
                sendWebhookForQueueIds.push({
                  queueId: tx.queueId!,
                  status: TransactionStatusEnum.Errored,
                });

                reportUsageForQueueIds.push({
                  input: {
                    fromAddress: tx.fromAddress || undefined,
                    toAddress: tx.toAddress || undefined,
                    value: tx.value || undefined,
                    chainId: tx.chainId || undefined,
                    functionName: tx.functionName || undefined,
                    extension: tx.extension || undefined,
                  },
                  action: UsageEventTxActionEnum.NotSentTx,
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
                sentAt: new Date(),
                status: TransactionStatusEnum.UserOpSent,
                userOpHash,
              },
            });
            sendWebhookForQueueIds.push({
              queueId: tx.queueId!,
              status: TransactionStatusEnum.UserOpSent,
            });
            reportUsageForQueueIds.push({
              input: {
                fromAddress: tx.accountAddress || undefined,
                toAddress: tx.toAddress || undefined,
                value: tx.value || undefined,
                chainId: tx.chainId || undefined,
                userOpHash,
                functionName: tx.functionName || undefined,
                extension: tx.extension || undefined,
              },
              action: UsageEventTxActionEnum.SentTx,
            });
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
            sendWebhookForQueueIds.push({
              queueId: tx.queueId!,
              status: TransactionStatusEnum.Errored,
            });
            reportUsageForQueueIds.push({
              input: {
                fromAddress: tx.accountAddress || undefined,
                toAddress: tx.toAddress || undefined,
                value: tx.value || undefined,
                chainId: tx.chainId || undefined,
                functionName: tx.functionName || undefined,
                extension: tx.extension || undefined,
              },
              action: UsageEventTxActionEnum.NotSentTx,
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

    await sendWebhooks(sendWebhookForQueueIds);
    await reportUsage(reportUsageForQueueIds);
  } catch (err: any) {
    logger({
      service: "worker",
      level: "error",
      message: `Failed to process batch of transactions`,
      error: err,
    });
  }
};
