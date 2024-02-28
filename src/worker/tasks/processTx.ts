/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Transactions } from ".prisma/client";
import {
  StaticJsonRpcBatchProvider,
  getDefaultGasOverrides,
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
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
import { msSince } from "../../utils/date";
import { env } from "../../utils/env";
import { parseTxError } from "../../utils/errors";
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

type RpcResponseData = {
  tx: Transactions;
  txRequest: ethers.providers.TransactionRequest;
  rpcResponse: RpcResponse;
};

export const processTx = async () => {
  try {
    const config = await getConfig();

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

        // Send queued webhook.
        await sendWebhooks(
          txs.map((tx) => ({
            queueId: tx.id,
            status: TransactionStatusEnum.Queued,
          })),
        );

        reportUsage(
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

        // 2. Update and sort transactions and user operations.
        const txsToSend: Transactions[] = [];
        const userOpsToSend: Transactions[] = [];
        for (const tx of txs) {
          logger({
            service: "worker",
            level: "info",
            queueId: tx.id,
            message: `Processing`,
          });

          await updateTx({
            pgtx,
            queueId: tx.id,
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

        // 3. Group transactions by wallet address and chain.
        const txsByWallet: Record<string, Transactions[]> = {};
        txsToSend.forEach((tx) => {
          const key = `${tx.fromAddress}-${tx.chainId}`;
          if (key in txsByWallet) {
            txsByWallet[key].push(tx);
          } else {
            txsByWallet[key] = [tx];
          }
        });

        // 4. Send transaction batches in parallel.
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

          // TODO: Move to be async.
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
              minimumBalance: ethers.utils.formatEther(config.minWalletBalance),
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
              let value = BigNumber.from(tx.value ?? 0);
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

              if (!rpcResponse.error && !!rpcResponse.result) {
                // Success (continue to next transaction)
                nonceIncrement++;
                txIndex++;

                rpcResponses.push({
                  tx,
                  txRequest,
                  rpcResponse,
                });
                sendWebhookForQueueIds.push({
                  queueId: tx.id,
                  status: TransactionStatusEnum.Submitted,
                });
              } else if (
                typeof rpcResponse.error?.message === "string" &&
                (rpcResponse.error.message as string)
                  .toLowerCase()
                  .includes("nonce too low")
              ) {
                // Nonce too low. Retry with a higher nonce.
                nonceIncrement++;
              } else {
                // Error. Continue to the next transaction.
                txIndex++;

                rpcResponses.push({
                  tx,
                  txRequest,
                  rpcResponse,
                });
                sendWebhookForQueueIds.push({
                  queueId: tx.id,
                  status: TransactionStatusEnum.Errored,
                });
              }
            } catch (err: any) {
              // Error. Continue to the next transaction.
              txIndex++;

              sendWebhookForQueueIds.push({
                queueId: tx.id,
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
                  provider: provider.connection.url || undefined,
                  msSinceQueue: msSince(tx.queuedAt),
                },
                action: UsageEventTxActionEnum.NotSendTx,
              });

              logger({
                service: "worker",
                level: "warn",
                queueId: tx.id,
                message: `Failed to send`,
                error: err,
              });

              await updateTx({
                pgtx,
                queueId: tx.id,
                data: {
                  status: TransactionStatusEnum.Errored,
                  errorMessage: await parseTxError(tx, err),
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

          // Update DB state in parallel.
          await Promise.all(
            rpcResponses.map(async ({ tx, txRequest, rpcResponse }) => {
              if (rpcResponse.result) {
                // Transaction was successful.
                const transactionHash = rpcResponse.result;
                const txResponse = (await provider.getTransaction(
                  transactionHash,
                )) as ethers.providers.TransactionResponse | null;

                await updateTx({
                  pgtx,
                  queueId: tx.id,
                  data: {
                    status: TransactionStatusEnum.Submitted,
                    transactionHash,
                    res: txResponse,
                    sentAt: new Date(),
                    sentAtBlockNumber:
                      txResponse?.blockNumber ??
                      (await provider.getBlockNumber()),
                  },
                });
                reportUsageForQueueIds.push({
                  input: {
                    fromAddress: txRequest.from,
                    toAddress: txRequest.to,
                    value: (txRequest.value ?? 0).toString(),
                    chainId: tx.chainId,
                    transactionHash,
                    functionName: tx.functionName || undefined,
                    extension: tx.extension || undefined,
                    provider: provider.connection.url || undefined,
                    msSinceQueue: msSince(tx.queuedAt),
                  },
                  action: UsageEventTxActionEnum.SendTx,
                });
              } else {
                // Transaction failed.
                await updateTx({
                  pgtx,
                  queueId: tx.id,
                  data: {
                    status: TransactionStatusEnum.Errored,
                    errorMessage: await parseTxError(tx, rpcResponse.error),
                  },
                });
                reportUsageForQueueIds.push({
                  input: {
                    fromAddress: txRequest.from,
                    toAddress: txRequest.to,
                    value: (txRequest.value ?? 0).toString(),
                    chainId: tx.chainId,
                    functionName: tx.functionName || undefined,
                    extension: tx.extension || undefined,
                    provider: provider.connection.url || undefined,
                    msSinceQueue: msSince(tx.queuedAt),
                  },
                  action: UsageEventTxActionEnum.NotSendTx,
                });
              }
            }),
          );
        });

        // 5. Send all user operations in parallel.
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
              queueId: tx.id,
              data: {
                sentAt: new Date(),
                status: TransactionStatusEnum.UserOpSent,
                userOpHash,
              },
            });
            sendWebhookForQueueIds.push({
              queueId: tx.id,
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
                provider: signer.httpRpcClient.bundlerUrl || undefined,
                msSinceQueue: msSince(tx.queuedAt),
              },
              action: UsageEventTxActionEnum.SendTx,
            });
          } catch (err: any) {
            logger({
              service: "worker",
              level: "warn",
              queueId: tx.id,
              message: `Failed to send`,
              error: err,
            });

            await updateTx({
              pgtx,
              queueId: tx.id,
              data: {
                status: TransactionStatusEnum.Errored,
                errorMessage: await parseTxError(tx, err),
              },
            });
            sendWebhookForQueueIds.push({
              queueId: tx.id,
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
                msSinceQueue: msSince(tx.queuedAt),
              },
              action: UsageEventTxActionEnum.NotSendTx,
            });
          }
        });

        await Promise.all([...sentTxs, ...sentUserOps]);
      },
      {
        // TODO: Should be dynamic with the batch size.
        timeout: 5 * 60_000,
      },
    );

    await sendWebhooks(sendWebhookForQueueIds);
    reportUsage(reportUsageForQueueIds);
  } catch (err: any) {
    logger({
      service: "worker",
      level: "error",
      message: `Failed to process batch of transactions`,
      error: err,
    });
  }
};
