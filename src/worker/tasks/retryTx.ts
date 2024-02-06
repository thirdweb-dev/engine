import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getTxToRetry } from "../../db/transactions/getTxToRetry";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
import { logger } from "../../utils/logger";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";

export const retryTx = async () => {
  try {
    await prisma.$transaction(
      async (pgtx) => {
        // Get one transaction to retry at a time
        const tx = await getTxToRetry({ pgtx });
        if (!tx) {
          return;
        }

        const config = await getConfig();
        const reportUsageForQueueIds: ReportUsageParams[] = [];
        const sdk = await getSdk({
          chainId: parseInt(tx.chainId!),
          walletAddress: tx.fromAddress!,
        });

        const blockNumber = await sdk.getProvider().getBlockNumber();
        // Only retry if more than the elapsed blocks before retry has passed.
        if (
          blockNumber - tx.sentAtBlockNumber! <=
          config.minEllapsedBlocksBeforeRetry
        ) {
          return;
        }

        const receipt = await sdk
          .getProvider()
          .getTransactionReceipt(tx.transactionHash!);

        // If the transaction is mined, update the DB.
        if (receipt) {
          return;
        }

        // TODO: We should still retry anyway
        const gasOverrides = await getDefaultGasOverrides(sdk.getProvider());

        if (tx.retryGasValues) {
          // If a retry has been triggered manually
          tx.maxFeePerGas = tx.retryMaxFeePerGas!;
          tx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas!;
        } else if (
          gasOverrides.maxFeePerGas?.gt(config.maxFeePerGasForRetries) ||
          gasOverrides.maxPriorityFeePerGas?.gt(
            config.maxPriorityFeePerGasForRetries,
          )
        ) {
          logger({
            service: "worker",
            level: "warn",
            queueId: tx.id,
            message: `${tx.chainId} chain gas price is higher than maximum threshold.`,
          });

          return;
        }

        logger({
          service: "worker",
          level: "info",
          queueId: tx.id,
          message: `Retrying with nonce ${tx.nonce}`,
        });

        const sentAt = new Date();
        let res: ethers.providers.TransactionResponse;
        try {
          res = await sdk.getSigner()!.sendTransaction({
            to: tx.toAddress!,
            from: tx.fromAddress!,
            data: tx.data!,
            nonce: tx.nonce!,
            value: tx.value!,
            ...gasOverrides,
            gasPrice: gasOverrides.gasPrice?.mul(2),
            maxFeePerGas: gasOverrides.maxFeePerGas?.mul(2),
            maxPriorityFeePerGas: gasOverrides.maxPriorityFeePerGas?.mul(2),
          });
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
              errorMessage:
                err?.message ||
                err?.toString() ||
                `Failed to handle transaction`,
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
              retryCount: tx.retryCount || 0,
            },
            action: UsageEventTxActionEnum.NotSentTx,
          });

          await reportUsage(reportUsageForQueueIds);

          return;
        }

        await updateTx({
          pgtx,
          queueId: tx.id,
          data: {
            sentAt,
            status: TransactionStatusEnum.Submitted,
            res,
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
            retryCount: tx.retryCount || 0,
          },
          action: UsageEventTxActionEnum.SentTx,
        });

        await reportUsage(reportUsageForQueueIds);

        logger({
          service: "worker",
          level: "info",
          queueId: tx.id,
          message: `Retried with hash ${res.hash} for Nonce ${res.nonce}`,
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
