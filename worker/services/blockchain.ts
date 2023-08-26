import { getBlock } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { getSDK } from "../../core";
import { TransactionSchema } from "../../server/schemas/transaction";

type TransactionReceiptWithBlockDetails = {
  txHash: string;
  blockNumber: number;
  chainId: string;
  queueId: string;
  timestamp: number;
  effectiveGasPrice: BigNumber;
};

export const getTransactionReceiptWithBlockDetails = async (
  server: FastifyInstance,
  transactions: TransactionSchema[],
): Promise<TransactionReceiptWithBlockDetails[]> => {
  try {
    const txReceiptData = await Promise.all(
      transactions.map(async (txData) => {
        server.log.debug(
          `Getting receipt for tx: ${txData.txHash} on chain: ${txData.chainId} for queueId: ${txData.identifier}`,
        );
        const sdk = await getSDK(txData.chainId!);
        const receipt = await sdk
          .getProvider()
          .getTransactionReceipt(txData.txHash!);
        return {
          receipt,
          chainId: txData.chainId!,
          queueId: txData.identifier!,
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
            txHash: "",
            blockNumber: -1,
            timestamp: -1,
            chainId: dt.chainId!,
            queueId: dt.queueId!,
            effectiveGasPrice: BigNumber.from(0),
          };
        }
        const sdk = await getSDK(dt.chainId!);
        const blockNumberDetails = await getBlock({
          block: dt.receipt.blockNumber,
          network: sdk.getProvider(),
        });
        return {
          txHash: dt.receipt.transactionHash,
          blockNumber: dt.receipt.blockNumber,
          timestamp: blockNumberDetails.timestamp * 1000,
          chainId: dt.chainId!,
          queueId: dt.queueId!,
          effectiveGasPrice: dt.receipt.effectiveGasPrice,
        };
      }),
    );

    return txDatawithBlockDetails;
  } catch (error) {
    server.log.error(error, "Error in getTransactionReceiptFromChain");
    return [];
  }
};
