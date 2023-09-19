import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { env, getSDK } from "../../core";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import { prisma } from "../../src/db/client";
import { getTxToRetry } from "../../src/db/transactions/getTxToRetry";
import { updateTx } from "../../src/db/transactions/updateTx";
import { logger } from "../../src/utils/logger";
import { getTransactionReceiptWithBlockDetails } from "../services/blockchain";

const RETRY_TX_ENABLED = env.RETRY_TX_ENABLED;
const MAX_FEE_PER_GAS_FOR_RETRY = BigNumber.from(env.MAX_FEE_PER_GAS_FOR_RETRY);
const MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY = BigNumber.from(
  env.MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY,
);

export const retryTransactions = async () => {
  try {
    if (!RETRY_TX_ENABLED) {
      logger.worker.warn("Retry Tx Cron is disabled");
      return;
    }

    let error;

    await prisma.$transaction(
      async (pgtx) => {
        logger.worker.info("Running Cron to Retry transactions on blockchain");
        const transactions = await getTxToRetry({ pgtx });

        if (transactions.length === 0) {
          logger.worker.warn("No transactions to retry");
          return;
        }

        const txReceiptsWithChainId =
          await getTransactionReceiptWithBlockDetails(transactions);

        for (let txReceiptData of txReceiptsWithChainId) {
          // Check if transaction got mined on chain
          if (
            txReceiptData.blockNumber != -1 &&
            txReceiptData.chainId &&
            txReceiptData.queueId &&
            txReceiptData.txHash != "" &&
            txReceiptData.effectiveGasPrice != BigNumber.from(-1) &&
            txReceiptData.timestamp != -1
          ) {
            logger.worker.debug(
              `Got receipt for tx: ${txReceiptData.txHash}, queueId: ${txReceiptData.queueId}, effectiveGasPrice: ${txReceiptData.effectiveGasPrice}`,
            );
          } else {
            const sdk = await getSDK(
              txReceiptData.txData.chainId!.toString(),
              txReceiptData.txData.fromAddress!,
            );
            const currentBlockNumber = await sdk.getProvider().getBlockNumber();

            if (
              currentBlockNumber - txReceiptData.txData.sentAtBlockNumber! >
              env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
            ) {
              logger.worker.debug(
                `Retrying tx: ${txReceiptData.txHash}, queueId: ${txReceiptData.queueId} with higher gas values`,
              );

              const gasData = await getDefaultGasOverrides(sdk.getProvider());
              logger.worker.debug(
                `Gas Data MaxFeePerGas: ${gasData.maxFeePerGas}, MaxPriorityFeePerGas: ${gasData.maxPriorityFeePerGas}, gasPrice`,
              );

              if (
                gasData.maxFeePerGas?.lte(
                  BigNumber.from(txReceiptData.txData.maxFeePerGas),
                )
              ) {
                logger.worker.warn(
                  `Gas Data MaxFeePerGas: ${gasData.maxFeePerGas} is less than or equal to Previously Submitted Transaction: ${txReceiptData.txData.maxFeePerGas} for queueId: ${txReceiptData.queueId}. Will Retry Later`,
                );
                continue;
              }

              // Re-Submit transaction to the blockchain
              // Create transaction object
              const txObject: providers.TransactionRequest = {
                to: txReceiptData.txData.toAddress!,
                from: txReceiptData.txData.fromAddress!,
                data: txReceiptData.txData.data!,
                nonce: txReceiptData.txData.nonce!,
                value: txReceiptData.txData.value!,
                ...gasData,
              };

              // Override gas values from DB if flag is true
              if (txReceiptData.txData.retryGasValues) {
                logger.worker.info(
                  `Setting Gas Values from DB as override flag is set to true. MaxFeePerGas: ${txReceiptData.txData.retryMaxFeePerGas}, MaxPriorityFeePerGas: ${txReceiptData.txData.retryMaxPriorityFeePerGas} for queueId: ${txReceiptData.queueId}`,
                );
                txObject.maxFeePerGas = txReceiptData.txData.retryMaxFeePerGas!;
                txObject.maxPriorityFeePerGas =
                  txReceiptData.txData.retryMaxPriorityFeePerGas!;
              } else if (
                gasData.maxFeePerGas?.gt(MAX_FEE_PER_GAS_FOR_RETRY!) ||
                gasData.maxPriorityFeePerGas?.gt(
                  MAX_PRIORITY_FEE_PER_GAS_FOR_RETRY!,
                )
              ) {
                logger.worker.warn(
                  `${txReceiptData.txData
                    .chainId!} Chain Gas Price is higher than Max Threshold for retrying transaction ${
                    txReceiptData.queueId
                  }. Will try again after ${
                    env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
                  } blocks or in 30 seconds`,
                );
                continue;
              }

              // Send transaction to the blockchain
              let txRes: ethers.providers.TransactionResponse | undefined;
              try {
                txRes = await sdk.getSigner()?.sendTransaction(txObject);
              } catch (err: any) {
                logger.worker.debug("Send Transaction errored");
                logger.worker.warn(
                  `Request-ID: ${txReceiptData.queueId} processed but errored out: Commited to db`,
                );

                await updateTx({
                  pgtx,
                  queueId: txReceiptData.txData.queueId!,
                  status: TransactionStatusEnum.Errored,
                  txData: {
                    errorMessage: err.message,
                  },
                });

                // Preserve error to throw outside of transaction
                error = err;
                return;
              }

              await updateTx({
                pgtx,
                queueId: txReceiptData.txData.queueId!,
                status: TransactionStatusEnum.Submitted,
                res: txRes,
                txData: {
                  retryCount: txReceiptData.txData.retryCount + 1,
                  sentAtBlockNumber: currentBlockNumber,
                },
              });
              logger.worker.info(
                `Transaction re-submitted for ${txReceiptData.queueId} with Nonce ${txReceiptData.txData.nonce}, Tx Hash: ${txRes?.hash}`,
              );
            } else {
              logger.worker.info(
                `Will retry later Request with queueId ${
                  txReceiptData.queueId
                } after ${
                  env.MAX_BLOCKS_ELAPSED_BEFORE_RETRY
                } blocks, Elasped Blocks: ${
                  currentBlockNumber - txReceiptData.txData.sentAtBlockNumber!
                }`,
              );
            }
          }
        }

        return;
      },
      {
        timeout: 5 * 60000,
      },
    );

    if (error) {
      throw error;
    }
  } catch (error) {
    logger.worker.error(error);
    return;
  }
};
