import type { Transactions } from "@prisma/client";
import { randomUUID } from "crypto";
import { simulate } from "../../server/utils/simulateTx";
import { UsageEventTxActionEnum, reportUsage } from "../../utils/usage";
import { ingestQueue } from "../../worker/queues/queues";
import { getWalletDetails } from "../wallets/getWalletDetails";

type QueueTxRawParams = {
  tx: Partial<Transactions>;
  simulateTx?: boolean;
  idempotencyKey?: string;
};

export const queueTxRaw = async ({
  tx,
  simulateTx,
  idempotencyKey,
}: QueueTxRawParams) => {
  const walletAddress = tx.fromAddress || tx.signerAddress;
  if (!walletAddress) {
    throw new Error("tx is missing fromAddress or signerAddress.");
  }

  const walletDetails = await getWalletDetails({
    address: walletAddress.toLowerCase(),
  });
  if (!walletDetails) {
    throw new Error(
      `No backend wallet found with address ${
        tx.fromAddress || tx.signerAddress
      }`,
    );
  }

  tx.id = randomUUID();
  tx.idempotencyKey = idempotencyKey ?? tx.id;

  if (simulateTx) {
    await simulate({ txRaw: tx });
  }

  reportUsage([
    {
      input: {
        chainId: tx.chainId || undefined,
        fromAddress: tx.fromAddress || undefined,
        toAddress: tx.toAddress || undefined,
        value: tx.value || undefined,
        transactionHash: tx.transactionHash || undefined,
        functionName: tx.functionName || undefined,
        extension: tx.extension || undefined,
      },
      action: UsageEventTxActionEnum.QueueTx,
    },
  ]);

  const job = { tx };
  await ingestQueue.add(tx.id, job, {
    jobId: tx.idempotencyKey,
  });
  return { id: tx.id };
};

const hydratePartialTx = (partial: Partial<Transactions>): Transactions => ({
  id: "",
  groupId: null,
  data: null,
  value: null,
  gasLimit: null,
  nonce: null,
  maxFeePerGas: null,
  maxPriorityFeePerGas: null,
  fromAddress: null,
  toAddress: null,
  gasPrice: null,
  transactionType: null,
  transactionHash: null,
  onChainTxStatus: null,
  signerAddress: null,
  accountAddress: null,
  target: null,
  sender: null,
  initCode: null,
  callData: null,
  callGasLimit: null,
  verificationGasLimit: null,
  preVerificationGas: null,
  paymasterAndData: null,
  userOpHash: null,
  functionName: null,
  functionArgs: null,
  extension: null,
  deployedContractAddress: null,
  deployedContractType: null,
  processedAt: null,
  sentAt: null,
  minedAt: null,
  cancelledAt: null,
  retryGasValues: null,
  retryMaxPriorityFeePerGas: null,
  retryMaxFeePerGas: null,
  errorMessage: null,
  sentAtBlockNumber: null,
  blockNumber: null,
  ...partial,
});
