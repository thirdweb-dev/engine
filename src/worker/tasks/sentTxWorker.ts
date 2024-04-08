import { Job, Worker } from "bullmq";
import superjson from "superjson";
import {
  PreparedTransaction,
  defineChain,
  eth_blockNumber,
  eth_getBlockByNumber,
  eth_getTransactionByHash,
  eth_getTransactionReceipt,
  getRpcClient,
  prepareTransaction,
  sendTransaction,
} from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { resolvePromisedValue } from "thirdweb/dist/types/utils/promise/resolve-promised-value";
import { TransactionReceipt } from "viem";
import { updateTx } from "../../db/transactions/updateTx";
import { SentTransaction } from "../../schema/transaction";
import { TransactionStatus } from "../../server/schemas/transaction";
import { cancelTransactionAndUpdate } from "../../server/utils/transaction";
import { getConfig } from "../../utils/cache/getConfig";
import { getWallet } from "../../utils/cache/getWallet";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import { SentTransactionJob, SentTransactionQueue } from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

export class SentTxWorker {
  // Cancel unconfirmed transactions after one hour.
  private CANCEL_TIMEOUT_SECONDS = 60 * 60;

  private w: Worker;

  constructor() {
    this.w = new Worker(SentTransactionQueue.name, this.handle, {
      concurrency: env.SENT_TX_WORKER_CONCURRENCY,
      connection: redis,
    });
    logWorkerEvents(this.w);
  }

  handle = async (job: Job) => {
    const { sentTransaction } = superjson.parse<SentTransactionJob>(job.data);
    const chain = defineChain(sentTransaction.chainId);
    const rpcRequest = getRpcClient({ client: thirdwebClient, chain });

    // Handle if transaction is onchain or may need to be retried/cancelled.
    const transactionReceipt = await eth_getTransactionReceipt(rpcRequest, {
      hash: sentTransaction.transactionHash,
    });

    if (transactionReceipt) {
      await this.handleConfirmOnchain(sentTransaction, transactionReceipt);
    } else {
      await this.handleRetry(sentTransaction);
    }
  };

  handleConfirmOnchain = async (
    sentTransaction: SentTransaction,
    transactionReceipt: TransactionReceipt,
  ) => {
    const chain = defineChain(sentTransaction.chainId);
    const rpcRequest = getRpcClient({ client: thirdwebClient, chain });

    // Get minedAt time.
    const block = await eth_getBlockByNumber(rpcRequest, {
      blockNumber: transactionReceipt.blockNumber,
    });
    const minedAt = block
      ? new Date(Number(block.timestamp) * 1000)
      : // Edge case: the RPC may not have the block indexed yet. Fall back to the current time.
        new Date();

    const transactionResponse = await eth_getTransactionByHash(rpcRequest, {
      hash: transactionReceipt.transactionHash,
    });

    // Update the transactions DB.
    await updateTx({
      queueId: sentTransaction.id,
      data: {
        status: TransactionStatus.Mined,
        minedAt,
        minedAtBlock: transactionReceipt.blockNumber,
        onChainTxStatus: transactionReceipt.status,
        transactionHash: transactionReceipt.transactionHash,
        transactionType: transactionReceipt.type === "legacy" ? 0 : 1, // @TODO: Fix this
        gasPrice: transactionReceipt.effectiveGasPrice,
        gas: transactionReceipt.gasUsed,
        maxFeePerGas: transactionResponse.maxFeePerGas,
        maxPriorityFeePerGas: transactionResponse.maxPriorityFeePerGas,
        nonce: transactionResponse.nonce,
      },
    });

    // @TODO: report usage
  };

  handleRetry = async (sentTransaction: SentTransaction) => {
    const chain = defineChain(sentTransaction.chainId);
    const rpcRequest = getRpcClient({ client: thirdwebClient, chain });
    const config = await getConfig();

    // Retry recently submitted transaction later.
    const block = await eth_blockNumber(rpcRequest);
    const ellapsedBlocks = block - sentTransaction.sentAtBlock;
    if (ellapsedBlocks < config.minEllapsedBlocksBeforeRetry) {
      throw new Error("Transaction is recently submitted. Trying again later.");
    }

    // Cancel unconfirmed transactions after some duration.
    const ellapsedSeconds =
      (Date.now() - sentTransaction.sentAt.getTime()) / 1_000;
    if (ellapsedSeconds > this.CANCEL_TIMEOUT_SECONDS) {
      return this.handleCancel(sentTransaction);
    }

    // Assert queuedTransaction is valid.
    // @TODO: typing?
    if (!sentTransaction.fromAddress) {
      throw new Error("Queued transaction missing required fields.");
    }

    const wallet = await getWallet({
      chainId: chain.id,
      walletAddress: sentTransaction.fromAddress,
    });
    const account = await ethers5Adapter.signer.fromEthers({
      signer: wallet.getSigner(),
    });

    // Prepare the transaction with aggressive gas settings.
    const preparedTransaction = prepareTransaction({
      client: thirdwebClient,
      chain,
      to: sentTransaction.toAddress,
      data: sentTransaction.data as `0x${string}`,
      value: sentTransaction.value,
      nonce: sentTransaction.nonce,
    });
    const retryTransaction = await this.updateTransactionGasOptions({
      preparedTransaction,
      sentTransaction,
    });

    // Send transaction to RPC.
    let transactionHash: `0x${string}`;
    try {
      const result = await sendTransaction({
        transaction: retryTransaction,
        account,
      });
      transactionHash = result.transactionHash;
    } catch (e) {
      // RPC returned an error.
      // @TODO: flag tx as errored.
      return;
    }

    // Update the transactions DB.
    await updateTx({
      queueId: sentTransaction.id,
      data: {
        status: TransactionStatus.Sent,
        sentAt: new Date(),
        sentAtBlock: await eth_blockNumber(rpcRequest),
        transactionHash,
        retryCount: 1,
        nonce: sentTransaction.nonce,
        transactionType: 0, // @TODO: Fix this
        gas: sentTransaction.gas,
        gasPrice: await resolvePromisedValue(retryTransaction.gasPrice),
        maxFeePerGas: await resolvePromisedValue(retryTransaction.maxFeePerGas),
        maxPriorityFeePerGas: await resolvePromisedValue(
          retryTransaction.maxPriorityFeePerGas,
        ),
        value: sentTransaction.value,
      },
    });
  };

  handleCancel = async (sentTransaction: SentTransaction) => {
    await cancelTransactionAndUpdate({
      queueId: sentTransaction.id,
    });
  };

  /**
   * Returns the gas options to use for a retry.
   * Sets double the current gas options, and at least 10% higher than the last attempt.
   * @param sentTransaction SentTransaction
   * @returns gasPrice or maxFeePerGas+maxPriorityFeePerGas
   */
  private updateTransactionGasOptions = async (args: {
    preparedTransaction: PreparedTransaction;
    sentTransaction: SentTransaction;
  }): Promise<PreparedTransaction> => {
    // bigint helpers
    const max = (a: bigint, b: bigint) => (a > b ? a : b);
    const multiply = (val: bigint, mult: number) => {
      if (Number.isInteger(mult)) return val * BigInt(mult);
      return (val * BigInt(mult * 10_000)) / 10_000n;
    };

    const { preparedTransaction, sentTransaction } = args;

    // Legacy gas options.
    const preparedGasPrice = await resolvePromisedValue(
      preparedTransaction.gasPrice,
    );
    if (preparedGasPrice && sentTransaction.gasPrice) {
      return {
        ...preparedTransaction,
        gasPrice: max(
          multiply(preparedGasPrice, 2),
          multiply(sentTransaction.gasPrice, 1.1),
        ),
      };
    }

    // EIP 1559 gas options.
    const preparedMaxFeePerGas = await resolvePromisedValue(
      preparedTransaction.maxFeePerGas,
    );
    const preparedMaxPriorityFeePerGas = await resolvePromisedValue(
      preparedTransaction.maxPriorityFeePerGas,
    );
    if (
      preparedMaxFeePerGas &&
      preparedMaxPriorityFeePerGas &&
      sentTransaction.maxFeePerGas &&
      sentTransaction.maxPriorityFeePerGas
    ) {
      return {
        ...preparedTransaction,
        maxFeePerGas: max(
          multiply(preparedMaxFeePerGas, 2),
          multiply(sentTransaction.maxFeePerGas, 1.1),
        ),
        maxPriorityFeePerGas: max(
          multiply(preparedMaxPriorityFeePerGas, 2),
          multiply(sentTransaction.maxPriorityFeePerGas, 1.1),
        ),
      };
    }

    throw new Error(
      "The prepared transaction in a retry attempt has invalid gas options.",
    );
  };
}
