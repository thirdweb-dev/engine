/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Transactions } from ".prisma/client";
import { getChainByChainIdAsync } from "@thirdweb-dev/chains";
import {
  StaticJsonRpcBatchProvider,
  ThirdwebSDK,
  UserWallet,
  getDefaultGasOverrides,
} from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { RpcResponse } from "viem/_types/utils/rpc";
import { updateTx } from "../../db/transactions/updateTx";
import { getWalletNonce } from "../../db/wallets/getWalletNonce";
import { updateWalletNonce } from "../../db/wallets/updateWalletNonce";
import { WalletBalanceWebhookSchema } from "../../schema/webhooks";
import { TransactionStatus } from "../../server/schemas/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
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
import { getContractAddress } from "ethers/lib/utils";
import { redis } from "../../utils/redis/redis";

const getTxDataForQueueId = async (queueId: string) => {
  const txData = await redis.hgetall(queueId);
  const tx = JSON.parse(txData["txData"]);
  logger({
    service: "worker",
    level: "info",
    message: `Processing tx: ${tx}`,
  });

  return tx;
};

const getAndCommitNextNonce = async (
  chainId: number,
  address: string,
  sdk: ThirdwebSDK,
  provider: StaticJsonRpcBatchProvider,
) => {
  // Important: We need to block this worker until the nonce lock is acquired
  const dbNonceData = await getWalletNonce({
    chainId,
    address,
  });

  // For each wallet address, check the nonce in database and the mempool
  const [mempoolNonceData, sentAtBlockNumber] = await Promise.all([
    sdk.wallet.getNonce("pending"),
    provider.getBlockNumber(),
  ]);

  // - Take the larger of the nonces, and update database nonce to mempool value if mempool is greater
  let startNonce: BigNumber;
  const mempoolNonce = BigNumber.from(mempoolNonceData);
  const dbNonce = BigNumber.from(dbNonceData?.nonce || 0);
  if (mempoolNonce.gt(dbNonce)) {
    await updateWalletNonce({
      chainId,
      address,
      nonce: mempoolNonce.toNumber(),
    });

    startNonce = mempoolNonce;
  } else {
    startNonce = dbNonce;
  }

  const nonce = startNonce.add(1);

  return nonce.toNumber();
};

const submitEOATxn = async (
  sdk: ThirdwebSDK,
  provider: StaticJsonRpcBatchProvider,
  tx: Transactions,
) => {
  const chainId = parseInt(tx.chainId);
  const address = tx.fromAddress || tx.signerAddress || "";
  const signer = sdk.getSigner();
  if (!signer) {
    logger({
      service: "worker",
      level: "info",
      message: `No signer found for queueId: ${tx.id}`,
    });
    return;
  }
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

    const nonce = await getAndCommitNextNonce(chainId, address, sdk, provider);
    if (!nonce) {
      logger({
        service: "worker",
        level: "info",
        message: `No nonce found for queueId: ${tx.id}`,
      });
      return;
    }
    const gasOverrides = await getDefaultGasOverrides(provider);
    if (!gasOverrides) {
      logger({
        service: "worker",
        level: "info",
        message: `No gasOverrides found for queueId: ${tx.id}`,
      });
      return;
    }

    const txRequest = await signer.populateTransaction({
      to: tx.toAddress!,
      from: tx.fromAddress!,
      data: tx.data!,
      value,
      nonce,
      ...gasOverrides,
    });

    // Gas limit override
    if (tx.gasLimit) {
      txRequest.gasLimit = BigNumber.from(tx.gasLimit);
    } else {
      // TODO: We need to target specific cases
      // Bump gas limit to avoid occasional out of gas errors
      txRequest.gasLimit = txRequest.gasLimit
        ? BigNumber.from(txRequest.gasLimit).mul(120).div(100)
        : undefined;
    }

    // Gas price overrides
    if (tx.maxFeePerGas) {
      txRequest.maxFeePerGas = BigNumber.from(tx.maxFeePerGas);
    }

    if (tx.maxPriorityFeePerGas) {
      txRequest.maxPriorityFeePerGas = BigNumber.from(tx.maxPriorityFeePerGas);
    }

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
      // Transaction was successful.
      const transactionHash = rpcResponse.result;
      let contractAddress: string | undefined;
      if (tx.extension === "deploy-published" && tx.functionName === "deploy") {
        contractAddress = getContractAddress({
          from: txRequest.from!,
          nonce: BigNumber.from(txRequest.nonce!),
        });
      }
      await updateTx({
        queueId: tx.id,
        data: {
          status: TransactionStatus.Sent,
          transactionHash,
          res: txRequest,
          sentAt: new Date(),
          sentAtBlockNumber: rpcResponse.result.blockNumber, //TODO verify this
          deployedContractAddress: contractAddress,
        },
      });
      /*        reportUsageForQueueIds.push({*/
      /*input: {*/
      /*fromAddress: txRequest.from,*/
      /*toAddress: txRequest.to,*/
      /*value: (txRequest.value ?? 0).toString(),*/
      /*chainId: tx.chainId,*/
      /*transactionHash,*/
      /*functionName: tx.functionName || undefined,*/
      /*extension: tx.extension || undefined,*/
      /*provider: provider.connection.url || undefined,*/
      /*msSinceQueue: msSince(tx.queuedAt),*/
      /*},*/
      /*action: UsageEventTxActionEnum.SendTx,*/
      /*});*/
      /*sendWebhookForQueueIds.push({*/
      /*queueId: tx.id,*/
      /*status: TransactionStatus.Sent,*/
      /*});*/
    } else if (
      typeof rpcResponse.error?.message === "string" &&
      (rpcResponse.error.message as string)
        .toLowerCase()
        .includes("nonce too low")
    ) {
      // Nonce too low. Retry with a higher nonce.
      //nonceIncrement++;
      //TODO
    } else {
      // Transaction failed.
      await updateTx({
        queueId: tx.id,
        data: {
          status: TransactionStatus.Errored,
          errorMessage: await parseTxError(tx, rpcResponse.error),
        },
      });
      /*        reportUsageForQueueIds.push({*/
      /*input: {*/
      /*fromAddress: txRequest.from,*/
      /*toAddress: txRequest.to,*/
      /*value: (txRequest.value ?? 0).toString(),*/
      /*chainId: tx.chainId,*/
      /*functionName: tx.functionName || undefined,*/
      /*extension: tx.extension || undefined,*/
      /*provider: provider.connection.url || undefined,*/
      /*msSinceQueue: msSince(tx.queuedAt),*/
      /*},*/
      /*action: UsageEventTxActionEnum.NotSendTx,*/
      /*});*/
      /*sendWebhookForQueueIds.push({*/
      /*queueId: tx.id,*/
      /*status: TransactionStatus.Errored,*/
      /*});*/
    }
    await updateWalletNonce({
      address,
      chainId,
      nonce,
    });
  } catch (err: any) {
    // Error. Continue to the next transaction.
    //txIndex++;

    /*      sendWebhookForQueueIds.push({*/
    /*queueId: tx.id,*/
    /*status: TransactionStatus.Errored,*/
    /*});*/
    /*reportUsageForQueueIds.push({*/
    /*input: {*/
    /*fromAddress: tx.fromAddress || undefined,*/
    /*toAddress: tx.toAddress || undefined,*/
    /*value: tx.value || undefined,*/
    /*chainId: tx.chainId || undefined,*/
    /*functionName: tx.functionName || undefined,*/
    /*extension: tx.extension || undefined,*/
    /*provider: provider.connection.url || undefined,*/
    /*msSinceQueue: msSince(tx.queuedAt),*/
    /*},*/
    /*action: UsageEventTxActionEnum.NotSendTx,*/
    /*});*/

    logger({
      service: "worker",
      level: "warn",
      queueId: tx.id,
      message: `Failed to send`,
      error: err,
    });

    await updateTx({
      queueId: tx.id,
      data: {
        status: TransactionStatus.Errored,
        errorMessage: await parseTxError(tx, err),
      },
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

export const processTx = async (txQueueId: string) => {
  const sendWebhookForQueueIds: WebhookData[] = [];
  const reportUsageForQueueIds: ReportUsageParams[] = [];
  let tx: Transactions;
  let chainId;
  let address;

  try {
    tx = await getTxDataForQueueId(txQueueId);
    if (!tx) {
      logger({
        service: "worker",
        level: "info",
        message: `No tx found for queueId: ${txQueueId}`,
      });
      return;
    }
    chainId = parseInt(tx.chainId);
    address = tx.fromAddress || tx.signerAddress || "";
    if (!chainId || !address) {
      logger({
        service: "worker",
        level: "info",
        message: `No chainId or address found for queueId: ${txQueueId}`,
      });
      return;
    }

    const sdk = await getSdk({
      chainId,
      walletAddress: address,
    });

    const signer = sdk.getSigner();
    const provider = sdk.getProvider() as StaticJsonRpcBatchProvider;
    if (!signer) {
      return;
    }
    const isEOATx = !tx.signerAddress;
    const isUserOpTx = !!tx.signerAddress;
    if (isEOATx) {
      logger({
        service: "worker",
        level: "info",
        message: `Processing EOATx for queueId: ${tx.id}`,
      });
      await submitEOATxn(sdk, provider, tx);
    } else if (isUserOpTx) {
      await submitUserOpTx(sdk, tx);
    }

    // Async: check if this wallet has low gas funds.
    alertOnBackendWalletLowBalance(sdk.wallet);

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
const submitUserOpTx = async (sdk: ThirdwebSDK, tx: Transactions) => {
  // 5. Send all user operations in parallel.
  try {
    const sdk = await getSdk({
      chainId: parseInt(tx.chainId!),
      walletAddress: tx.signerAddress!,
      accountAddress: tx.accountAddress!,
    });
    const signer = sdk.getSigner() as ERC4337EthersSigner;

    const nonce = randomNonce();
    const unsignedOp = await signer.smartAccountAPI.createUnsignedUserOp(
      signer.httpRpcClient,
      {
        target: tx.target || "",
        data: tx.data || "0x",
        value: tx.value ? BigNumber.from(tx.value) : undefined,
        nonce,
      },
    );

    // Temporary fix untill SDK allows us to do this
    if (tx.gasLimit) {
      unsignedOp.callGasLimit = BigNumber.from(tx.gasLimit);
      unsignedOp.paymasterAndData = "0x";
      const DUMMY_SIGNATURE =
        "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
      unsignedOp.signature = DUMMY_SIGNATURE;
      const paymasterResult =
        await signer.smartAccountAPI.paymasterAPI.getPaymasterAndData(
          unsignedOp,
        );
      const paymasterAndData = paymasterResult.paymasterAndData;
      if (paymasterAndData && paymasterAndData !== "0x") {
        unsignedOp.paymasterAndData = paymasterAndData;
      }
    }

    const userOp = await signer.smartAccountAPI.signUserOp(unsignedOp);
    const userOpHash = await signer.smartAccountAPI.getUserOpHash(userOp);

    await signer.httpRpcClient.sendUserOpToBundler(userOp);

    // TODO: Need to update with other user op data
    await updateTx({
      queueId: tx.id,
      data: {
        sentAt: new Date(),
        status: TransactionStatus.UserOpSent,
        userOpHash,
      },
    });
    /*    sendWebhookForQueueIds.push({*/
    /*queueId: tx.id,*/
    /*status: TransactionStatus.UserOpSent,*/
    /*});*/
    /*reportUsageForQueueIds.push({*/
    /*input: {*/
    /*fromAddress: tx.accountAddress || undefined,*/
    /*toAddress: tx.toAddress || undefined,*/
    /*value: tx.value || undefined,*/
    /*chainId: tx.chainId || undefined,*/
    /*userOpHash,*/
    /*functionName: tx.functionName || undefined,*/
    /*extension: tx.extension || undefined,*/
    /*provider: signer.httpRpcClient.bundlerUrl || undefined,*/
    /*msSinceQueue: msSince(tx.queuedAt),*/
    /*},*/
    /*action: UsageEventTxActionEnum.SendTx,*/
    /*});*/
  } catch (err: any) {
    logger({
      service: "worker",
      level: "warn",
      queueId: tx.id,
      message: `Failed to send`,
      error: err,
    });

    await updateTx({
      queueId: tx.id,
      data: {
        status: TransactionStatus.Errored,
        errorMessage: await parseTxError(tx, err),
      },
    });
    /*    sendWebhookForQueueIds.push({*/
    /*queueId: tx.id,*/
    /*status: TransactionStatus.Errored,*/
    /*});*/
    /*reportUsageForQueueIds.push({*/
    /*input: {*/
    /*fromAddress: tx.accountAddress || undefined,*/
    /*toAddress: tx.toAddress || undefined,*/
    /*value: tx.value || undefined,*/
    /*chainId: tx.chainId || undefined,*/
    /*functionName: tx.functionName || undefined,*/
    /*extension: tx.extension || undefined,*/
    /*msSinceQueue: msSince(tx.queuedAt),*/
    /*},*/
    /*action: UsageEventTxActionEnum.NotSendTx,*/
    /*});*/
  }
};
