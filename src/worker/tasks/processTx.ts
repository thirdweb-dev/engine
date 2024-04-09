/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import {
  StaticJsonRpcBatchProvider,
  UserWallet,
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
import { TransactionStatus } from "../../server/schemas/transaction";
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
import { getWithdrawValue } from "../utils/withdraw";

type RpcResponseData = {
  tx: Transactions;
  txRequest: ethers.providers.TransactionRequest;
  rpcResponse: RpcResponse;
};

export const processTx = async () => {
  try {
    const sendWebhookForQueueIds: WebhookData[] = [];
    const reportUsageForQueueIds: ReportUsageParams[] = [];
    await prisma.$transaction(
      async (pgtx) => {
        // 1. Select a batch of transactions and lock the rows so no other workers pick them up
        const txs = await getQueuedTxs({ pgtx });

        if (txs.length === 0) {
          return;
        }

        logger({
          service: "worker",
          level: "info",
          message: `Received ${txs.length} transactions to process`,
        });

        // 2. Sort transactions and user operations.
        const txsToSend: Transactions[] = [];
        const userOpsToSend: Transactions[] = [];
        for (const tx of txs) {
          logger({
            service: "worker",
            level: "info",
            queueId: tx.id,
            message: `Processing`,
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

          const signer = sdk.getSigner();
          const provider = sdk.getProvider() as StaticJsonRpcBatchProvider;
          if (!signer) {
            return;
          }

          // Important: We need to block this worker until the nonce lock is acquired
          const dbNonceData = await getWalletNonce({
            pgtx,
            chainId,
            address: walletAddress,
          });

          // For each wallet address, check the nonce in database and the mempool
          const [mempoolNonceData, gasOverrides, sentAtBlockNumber] =
            await Promise.all([
              sdk.wallet.getNonce("pending"),
              getDefaultGasOverrides(provider),
              provider.getBlockNumber(),
            ]);

          // - Take the larger of the nonces, and update database nonce to mempool value if mempool is greater
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
                const withdrawValue = await getWithdrawValue({
                  chainId,
                  fromAddress: tx.fromAddress!,
                  toAddress: tx.toAddress!,
                });
                value = BigNumber.from(withdrawValue.toString());
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
                  status: TransactionStatus.Sent,
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
                  status: TransactionStatus.Errored,
                });
              }
            } catch (err: any) {
              // Error. Continue to the next transaction.
              txIndex++;

              sendWebhookForQueueIds.push({
                queueId: tx.id,
                status: TransactionStatus.Errored,
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
                  status: TransactionStatus.Errored,
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
                await updateTx({
                  pgtx,
                  queueId: tx.id,
                  data: {
                    status: TransactionStatus.Sent,
                    transactionHash,
                    res: txRequest,
                    sentAt: new Date(),
                    sentAtBlockNumber: sentAtBlockNumber!,
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
                    status: TransactionStatus.Errored,
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

          // Async: check if this wallet has low gas funds.
          alertOnBackendWalletLowBalance(sdk.wallet);
        });

        // 5. Send all user operations in parallel.
        const sentUserOps = userOpsToSend.map(async (tx) => {
          try {
            const sdk = await getSdk({
              pgtx,
              chainId: parseInt(tx.chainId!),
              walletAddress: tx.signerAddress!,
              accountAddress: tx.accountAddress!,
            });
            const signer = sdk.getSigner() as ERC4337EthersSigner;

            const nonce = randomNonce();
            const unsignedOp =
              await signer.smartAccountAPI.createUnsignedUserOp(
                signer.httpRpcClient,
                {
                  target: tx.target || "",
                  data: tx.data || "0x",
                  value: tx.value ? BigNumber.from(tx.value) : undefined,
                  nonce,
                },
              );
            const userOp = await signer.smartAccountAPI.signUserOp(unsignedOp);
            const userOpHash = await signer.smartAccountAPI.getUserOpHash(
              userOp,
            );

            // TODO (bundler): this could go through the internal bundler if configured
            await signer.httpRpcClient.sendUserOpToBundler(userOp);

            // TODO: Need to update with other user op data
            await updateTx({
              pgtx,
              queueId: tx.id,
              data: {
                sentAt: new Date(),
                status: TransactionStatus.UserOpSent,
                userOpHash,
              },
            });
            sendWebhookForQueueIds.push({
              queueId: tx.id,
              status: TransactionStatus.UserOpSent,
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
                status: TransactionStatus.Errored,
                errorMessage: await parseTxError(tx, err),
              },
            });
            sendWebhookForQueueIds.push({
              queueId: tx.id,
              status: TransactionStatus.Errored,
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

const alertOnBackendWalletLowBalance = async (wallet: UserWallet) => {
  try {
    const balance = await wallet.balance();
    const config = await getConfig();
    const chain = await getChainByChainIdAsync(await wallet.getChainId());
    const address = await wallet.getAddress();

    if (BigNumber.from(balance.value).lte(config.minWalletBalance)) {
      const minBalanceDisplay = ethers.utils.formatEther(
        config.minWalletBalance,
      );

      const walletBalanceData: WalletBalanceWebhookSchema = {
        walletAddress: address,
        minimumBalance: minBalanceDisplay,
        currentBalance: balance.displayValue,
        chainId: chain.chainId,
        message: `Backend wallet ${address} has below ${minBalanceDisplay} ${chain.nativeCurrency.symbol}.`,
      };

      await sendBalanceWebhook(walletBalanceData);
    }
  } catch (e) {}
};
