import { StaticJsonRpcBatchProvider } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { prisma } from "../../db/client";
import { getTxToRetry } from "../../db/transactions/getTxToRetry";
import { updateTx } from "../../db/transactions/updateTx";
import { TransactionStatus } from "../../server/schemas/transaction";
import { cancelTransactionAndUpdate } from "../../server/utils/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getSdk } from "../../utils/cache/getSdk";
import { parseTxError } from "../../utils/errors";
import { getGasSettingsForRetry } from "../../utils/gas";
import { logger } from "../../utils/logger";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";

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
        const sdk = await getSdk({
          chainId: parseInt(tx.chainId!),
          walletAddress: tx.fromAddress!,
        });
        const provider = sdk.getProvider() as StaticJsonRpcBatchProvider;
        const blockNumber = await provider.getBlockNumber();

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
        const transactionRequest = {
          to: tx.toAddress!,
          from: tx.fromAddress!,
          data: tx.data!,
          nonce: tx.nonce!,
          value: tx.value!,
          ...gasOverrides,
        };

        // Send transaction.
        let transactionResponse: ethers.providers.TransactionResponse;
        try {
          transactionResponse = await sdk
            .getSigner()!
            .sendTransaction(transactionRequest);
        } catch (err: any) {
          // The RPC rejected this transaction.
          logger({
            service: "worker",
            level: "error",
            queueId: tx.id,
            message: "Failed to retry",
            error: err,
          });

          // Consume the nonce.
          await cancelTransactionAndUpdate({
            queueId: tx.id,
            pgtx,
          });
          await updateTx({
            pgtx,
            queueId: tx.id,
            data: {
              status: TransactionStatus.Errored,
              errorMessage: await parseTxError(tx, err),
            },
          });

          reportUsage([
            {
              input: {
                fromAddress: tx.fromAddress || undefined,
                toAddress: tx.toAddress || undefined,
                value: tx.value || undefined,
                chainId: tx.chainId,
                functionName: tx.functionName || undefined,
                extension: tx.extension || undefined,
                retryCount: tx.retryCount + 1,
                provider: provider.connection.url,
              },
              action: UsageEventTxActionEnum.ErrorTx,
            },
          ]);

          return;
        }

        await updateTx({
          pgtx,
          queueId: tx.id,
          data: {
            sentAt: new Date(),
            status: TransactionStatus.Sent,
            res: transactionRequest,
            sentAtBlockNumber: await provider.getBlockNumber(),
            retryCount: tx.retryCount + 1,
            transactionHash: transactionResponse.hash,
          },
        });

        reportUsage([
          {
            input: {
              fromAddress: tx.fromAddress || undefined,
              toAddress: tx.toAddress || undefined,
              value: tx.value || undefined,
              chainId: tx.chainId,
              functionName: tx.functionName || undefined,
              extension: tx.extension || undefined,
              retryCount: tx.retryCount + 1,
              transactionHash: transactionResponse.hash || undefined,
              provider: provider.connection.url,
            },
            action: UsageEventTxActionEnum.SendTx,
          },
        ]);

        logger({
          service: "worker",
          level: "info",
          queueId: tx.id,
          message: `Retried with hash ${transactionResponse.hash} for nonce ${transactionResponse.nonce}`,
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
