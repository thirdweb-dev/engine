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
import { PrismaTransaction } from "../../schema/prisma";
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
        const transactionsByWallet: Record<string, Transactions[]> = {};
        txsToSend.forEach((tx) => {
          const key = `${tx.fromAddress}-${tx.chainId}`;
          if (key in transactionsByWallet) {
            transactionsByWallet[key].push(tx);
          } else {
            transactionsByWallet[key] = [tx];
          }
        });

        const promises = [];

        // 4. Send transaction batches in parallel.
        for (const key of Object.keys(transactionsByWallet)) {
          const transactions = transactionsByWallet[key];
          const [walletAddress, chainId] = [
            key.split("-")[0],
            parseInt(key.split("-")[1]),
          ];

          promises.push(
            sendTransactions({
              pgtx,
              chainId,
              walletAddress,
              transactions,
            }),
          );
        }

        // 5. Send all user operations in parallel.
        for (const userOp of userOpsToSend) {
          promises.push(sendUserOp({ pgtx, userOp }));
        }

        const promiseResults = await Promise.allSettled(promises);
        for (const res of promiseResults) {
          if (res.status === "fulfilled") {
            sendWebhookForQueueIds.push(...res.value.webhooks);
            reportUsageForQueueIds.push(...res.value.usage);
          } else {
            logger({
              service: "worker",
              level: "error",
              message: "Failed to process batch of transactions",
              error: res.reason,
            });
          }
        }
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

const sendTransactions = async (args: {
  pgtx?: PrismaTransaction;
  chainId: number;
  walletAddress: string;
  transactions: Transactions[];
}): Promise<{ webhooks: WebhookData[]; usage: ReportUsageParams[] }> => {
  const { pgtx, chainId, walletAddress, transactions } = args;
  const webhooks: WebhookData[] = [];
  const usage: ReportUsageParams[] = [];

  const sdk = await getSdk({
    pgtx,
    chainId,
    walletAddress,
  });
  const signer = sdk.getSigner();
  const provider = sdk.getProvider() as StaticJsonRpcBatchProvider | null;
  if (!signer || !provider) {
    return { webhooks, usage };
  }

  // Important: We need to block this worker until the nonce lock is acquired
  const dbNonceData = await getWalletNonce({
    pgtx,
    chainId,
    address: walletAddress,
  });

  // For each wallet address, check the nonce in database and the mempool
  const [mempoolNonceData, gasOverrides, sentAtBlockNumber] = await Promise.all(
    [
      sdk.wallet.getNonce("pending"),
      getDefaultGasOverrides(provider),
      provider.getBlockNumber(),
    ],
  );

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

  while (txIndex < transactions.length) {
    const nonce = startNonce.add(nonceIncrement);
    const tx = transactions[txIndex];

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
        webhooks.push({
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
        webhooks.push({
          queueId: tx.id,
          status: TransactionStatus.Errored,
        });
      }
    } catch (err: any) {
      // Error. Continue to the next transaction.
      txIndex++;

      webhooks.push({
        queueId: tx.id,
        status: TransactionStatus.Errored,
      });
      usage.push({
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
        usage.push({
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
        usage.push({
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

  return { webhooks, usage };
};

const sendUserOp = async (args: {
  pgtx?: PrismaTransaction;
  userOp: Transactions;
}): Promise<{ webhooks: WebhookData[]; usage: ReportUsageParams[] }> => {
  const { pgtx, userOp } = args;

  try {
    const sdk = await getSdk({
      pgtx,
      chainId: parseInt(userOp.chainId),
      walletAddress: userOp.signerAddress!,
      accountAddress: userOp.accountAddress!,
    });
    const signer = sdk.getSigner() as ERC4337EthersSigner;

    const nonce = randomNonce();
    const unsignedUserOp = await signer.smartAccountAPI.createUnsignedUserOp(
      signer.httpRpcClient,
      {
        target: userOp.target || "",
        data: userOp.data || "0x",
        value: userOp.value ? BigNumber.from(userOp.value) : undefined,
        nonce,
      },
    );
    const signedUserOp = await signer.smartAccountAPI.signUserOp(
      unsignedUserOp,
    );
    const userOpHash = await signer.smartAccountAPI.getUserOpHash(signedUserOp);

    await signer.httpRpcClient.sendUserOpToBundler(signedUserOp);

    // TODO: Need to update with other user op data
    await updateTx({
      pgtx,
      queueId: userOp.id,
      data: {
        sentAt: new Date(),
        status: TransactionStatus.UserOpSent,
        userOpHash,
      },
    });

    return {
      webhooks: [
        {
          queueId: userOp.id,
          status: TransactionStatus.UserOpSent,
        },
      ],
      usage: [
        {
          input: {
            fromAddress: userOp.accountAddress || undefined,
            toAddress: userOp.toAddress || undefined,
            value: userOp.value || undefined,
            chainId: userOp.chainId || undefined,
            userOpHash,
            functionName: userOp.functionName || undefined,
            extension: userOp.extension || undefined,
            provider: signer.httpRpcClient.bundlerUrl || undefined,
            msSinceQueue: msSince(userOp.queuedAt),
          },
          action: UsageEventTxActionEnum.SendTx,
        },
      ],
    };
  } catch (err: any) {
    logger({
      service: "worker",
      level: "warn",
      queueId: userOp.id,
      message: "Failed to send userOp",
      error: err,
    });

    await updateTx({
      pgtx,
      queueId: userOp.id,
      data: {
        status: TransactionStatus.Errored,
        errorMessage: await parseTxError(userOp, err),
      },
    });

    return {
      webhooks: [
        {
          queueId: userOp.id,
          status: TransactionStatus.Errored,
        },
      ],
      usage: [
        {
          input: {
            fromAddress: userOp.accountAddress || undefined,
            toAddress: userOp.toAddress || undefined,
            value: userOp.value || undefined,
            chainId: userOp.chainId || undefined,
            functionName: userOp.functionName || undefined,
            extension: userOp.extension || undefined,
            msSinceQueue: msSince(userOp.queuedAt),
          },
          action: UsageEventTxActionEnum.NotSendTx,
        },
      ],
    };
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
