import { StaticJsonRpcBatchProvider } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getTxToRetry } from "../../db/transactions/getTxToRetry";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
import { parseTxError } from "../../utils/errors";
import { getGasSettingsForRetry } from "../../utils/gas";
import { logger } from "../../utils/logger";
import {
  ReportUsageParams,
  UsageEventTxActionEnum,
  reportUsage,
} from "../../utils/usage";

export const retryTx = async () => {
  try {
    await prisma.$transaction(
      async (pgtx) => {
        const tx = await getTxToRetry({ pgtx });
        if (!tx) {
          // Nothing to retry.
          return;
        }

        const config = await getConfig();
        const reportUsageForQueueIds: ReportUsageParams[] = [];
        const sdk = await getSdk({
          chainId: parseInt(tx.chainId!),
          walletAddress: tx.fromAddress!,
        });
        const provider = sdk.getProvider() as StaticJsonRpcBatchProvider;
        const blockNumber = await sdk.getProvider().getBlockNumber();

        if (
          blockNumber - tx.sentAtBlockNumber! <=
          config.minEllapsedBlocksBeforeRetry
        ) {
          // Return if too few blocks have passed since submitted. Try again later.
          return;
        }

        const receipt = await provider.getTransactionReceipt(
          tx.transactionHash!,
        );
        if (receipt) {
          // Return if the tx is already mined.
          return;
        }

        logger({
          service: "worker",
          level: "info",
          queueId: tx.id,
          message: `Retrying with nonce ${tx.nonce}`,
        });

        const gasOverrides = await getGasSettingsForRetry(tx, provider);
        let res: ethers.providers.TransactionResponse;
        const txRequest = {
          to: tx.toAddress!,
          from: tx.fromAddress!,
          data: tx.data!,
          nonce: tx.nonce!,
          value: tx.value!,
          ...gasOverrides,
        };
        try {
          res = await sdk.getSigner()!.sendTransaction(txRequest);
        } catch (err: any) {
          logger({
            service: "worker",
            level: "error",
            queueId: tx.id,
            message: `Failed to retry`,
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

          reportUsageForQueueIds.push({
            input: {
              fromAddress: tx.fromAddress || undefined,
              toAddress: tx.toAddress || undefined,
              value: tx.value || undefined,
              chainId: tx.chainId || undefined,
              functionName: tx.functionName || undefined,
              extension: tx.extension || undefined,
              retryCount: tx.retryCount + 1 || 0,
              provider: provider.connection.url || undefined,
            },
            action: UsageEventTxActionEnum.ErrorTx,
          });

          reportUsage(reportUsageForQueueIds);

          return;
        }

        await updateTx({
          pgtx,
          queueId: tx.id,
          data: {
            sentAt: new Date(),
            status: TransactionStatusEnum.Submitted,
            res: txRequest,
            sentAtBlockNumber: await sdk.getProvider().getBlockNumber(),
            retryCount: tx.retryCount + 1,
            transactionHash: res.hash,
          },
        });

        reportUsageForQueueIds.push({
          input: {
            fromAddress: tx.fromAddress || undefined,
            toAddress: tx.toAddress || undefined,
            value: tx.value || undefined,
            chainId: tx.chainId || undefined,
            functionName: tx.functionName || undefined,
            extension: tx.extension || undefined,
            retryCount: tx.retryCount + 1,
            transactionHash: res.hash || undefined,
            provider: provider.connection.url || undefined,
          },
          action: UsageEventTxActionEnum.SendTx,
        });

        reportUsage(reportUsageForQueueIds);

        logger({
          service: "worker",
          level: "info",
          queueId: tx.id,
          message: `Retried with hash ${res.hash} for nonce ${res.nonce}`,
        });
      },
      {
        timeout: 5 * 60000,
      },
    );
  } catch (err) {
    logger({
      service: "worker",
      level: "error",
      message: `Failed to retry transactions with error - ${err}`,
    });
    return;
  }
};
