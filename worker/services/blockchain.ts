import { Static } from "@sinclair/typebox";
import { getBlock } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { getSDK } from "../../core";
import { transactionResponseSchema } from "../../server/schemas/transaction";

type TransactionReceiptWithBlockDetails = {
  txHash: string;
  blockNumber: number;
  chainId: number;
  queueId: string;
  timestamp: number;
  effectiveGasPrice?: BigNumber;
  // TODO: Get rid of this ugly typebox type and use zod
  txData: Static<typeof transactionResponseSchema>;
};

export const getTransactionReceiptWithBlockDetails = async (
  server: FastifyInstance,
  transactions: Static<typeof transactionResponseSchema>[],
): Promise<TransactionReceiptWithBlockDetails[]> => {
  try {
    const txReceiptData = await Promise.all(
      transactions.map(async (tx) => {
        server.log.debug(
          `Getting receipt for tx: ${tx.transactionHash} on chain: ${tx.chainId} for queueId: ${tx.queueId}`,
        );
        const sdk = await getSDK(tx.chainId!.toString());
        const receipt = await sdk
          .getProvider()
          .getTransactionReceipt(tx.transactionHash!);
        return {
          receipt,
          chainId: tx.chainId!,
          queueId: tx.queueId!,
          txData: tx,
        };
      }),
    );

    const txDatawithBlockDetails = await Promise.all(
      txReceiptData.map(async (dt) => {
        if (!dt.receipt) {
          server.log.debug(
            `Receipt not found for tx: ${dt.queueId} on chain: ${dt.chainId}`,
          );
          return {
            txData: dt.txData,
            txHash: dt.txData.transactionHash!,
            blockNumber: -1,
            timestamp: -1,
            chainId: dt.chainId!,
            queueId: dt.queueId!,
            effectiveGasPrice: BigNumber.from(0),
          };
        }
        const sdk = await getSDK(dt.chainId!.toString());
        const blockNumberDetails = await getBlock({
          block: dt.receipt.blockNumber,
          network: sdk.getProvider(),
        });
        return {
          txData: dt.txData,
          txHash: dt.receipt.transactionHash,
          blockNumber: dt.receipt.blockNumber,
          timestamp: blockNumberDetails?.timestamp * 1000 || -1,
          chainId: dt.chainId!,
          queueId: dt.queueId!,
          effectiveGasPrice: dt.receipt.effectiveGasPrice,
        };
      }),
    );

    return txDatawithBlockDetails;
  } catch (error) {
    server.log.error(error, "Error in getTransactionReceiptWithBlockDetails");
    return [];
  }
};
