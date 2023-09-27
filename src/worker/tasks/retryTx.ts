import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { ethers } from "ethers";
import { BigNumber } from "ethers/lib/ethers";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { prisma } from "../../db/client";
import { getTxToRetry } from "../../db/transactions/getTxToRetry";
import { updateTx } from "../../db/transactions/updateTx";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export const retryTx = async () => {
  try {
    await prisma.$transaction(
      async (pgtx) => {
        // Get one transaction to retry at a time
        const tx = await getTxToRetry({ pgtx });

        if (!tx) {
          return;
        }

        const sdk = await getSdk({
          chainId: tx.chainId!,
          walletAddress: tx.fromAddress!,
        });
        const blockNumber = await sdk.getProvider().getBlockNumber();

        // Only retry if more than the ellapsed blocks before retry has passed
        if (
          blockNumber - tx.sentAtBlockNumber! <=
          env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
        ) {
          return;
        }

        const receipt = await sdk
          .getProvider()
          .getTransactionReceipt(tx.transactionHash!);

        // If the transaction has been mined but just not updated yet in database, don't retry
        if (!!receipt) {
          return;
        }

        // TODO: We should still retry anyway
        const gasOverrides = await getDefaultGasOverrides(sdk.getProvider());
        if (gasOverrides.maxFeePerGas?.lte(BigNumber.from(tx.maxFeePerGas))) {
          // If the current blockchain gas fees are lower than the transaction, wait
          return;
        }

        if (tx.retryGasValues) {
          // If a retry has been triggered manually
          tx.maxFeePerGas = tx.retryMaxFeePerGas!;
          tx.maxPriorityFeePerGas = tx.maxPriorityFeePerGas!;
        } else if (
          gasOverrides.maxFeePerGas?.gt(env.MAX_FEE_PER_GAS_FOR_RETRY!) ||
          gasOverrides.maxPriorityFeePerGas?.gt(
            env.MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY!,
          )
        ) {
          logger.worker.warn(
            `[Transaction] [${tx.id}] ${tx.chainId} chain gas price is higher than maximum threshold.`,
          );
          return;
        }

        logger.worker.info(`[Transaction] [${tx.id}] Retrying`);

        let res: ethers.providers.TransactionResponse;
        try {
          res = await sdk.getSigner()!.sendTransaction({
            to: tx.toAddress!,
            from: tx.fromAddress!,
            data: tx.data!,
            nonce: tx.nonce!,
            value: tx.value!,
            ...gasOverrides,
          });
        } catch (err: any) {
          logger.worker.warn(
            `[Transaction] [${tx.id}] Failed to retry with error - ${err}`,
          );

          await updateTx({
            pgtx,
            queueId: tx.id,
            status: TransactionStatusEnum.Errored,
            txData: {
              errorMessage:
                err?.message ||
                err?.toString() ||
                `Failed to handle transaction`,
            },
          });

          return;
        }

        await updateTx({
          pgtx,
          queueId: tx.id,
          status: TransactionStatusEnum.Submitted,
          res,
          txData: {
            retryCount: tx.retryCount + 1,
            sentAtBlockNumber: await sdk.getProvider().getBlockNumber(),
          },
        });

        logger.worker.info(`[Transaction] [${tx.id}] Retried`);
      },
      {
        timeout: 5 * 60000,
      },
    );
  } catch (err) {
    logger.worker.error(`Failed to retry transactions with error - ${err}`);
    return;
  }
};
