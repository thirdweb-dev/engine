import { Job, Worker } from "bullmq";
import superjson from "superjson";
import {
  Chain,
  PreparedTransaction,
  defineChain,
  eth_blockNumber,
  getRpcClient,
  prepareTransaction,
  sendTransaction,
} from "thirdweb";
import { ethers5Adapter } from "thirdweb/adapters/ethers5";
import { resolvePromisedValue } from "thirdweb/dist/types/utils/promise/resolve-promised-value";
import { estimateGasCost } from "thirdweb/transaction";
import { getWalletBalance } from "thirdweb/wallets";
import { QueuedTransaction, SentTransaction } from "../../schema/transaction";
import { getWallet } from "../../utils/cache/getWallet";
import { env } from "../../utils/env";
import { redis } from "../../utils/redis/redis";
import { thirdwebClient } from "../../utils/sdk";
import {
  QueuedTransactionJob,
  QueuedTransactionQueue,
  SentTransactionQueue,
} from "../queues/queues";
import { logWorkerEvents } from "../queues/workers";

export class QueuedTxWorker {
  private w: Worker;

  constructor() {
    this.w = new Worker(QueuedTransactionQueue.name, this.handle, {
      concurrency: env.QUEUED_TX_WORKER_CONCURRENCY,
      connection: redis,
    });
    logWorkerEvents(this.w);
  }

  handle = async (job: Job) => {
    const { queuedTransaction } = superjson.parse<QueuedTransactionJob>(
      job.data,
    );

    if (queuedTransaction.accountAddress && queuedTransaction.signerAddress) {
      return this.handleUserOp(queuedTransaction);
    }
    return this.handleTransaction(queuedTransaction);
  };

  /**
   * Prepares and sends an EOA transaction to RPC.
   * @param queuedTransaction QueuedTransaction
   */
  handleTransaction = async (queuedTransaction: QueuedTransaction) => {
    // Assert queuedTransaction is valid.
    // @TODO: typing?
    if (!queuedTransaction.fromAddress) {
      throw new Error("Queued transaction missing required fields.");
    }

    const chain = defineChain(queuedTransaction.chainId);
    const wallet = await getWallet({
      chainId: chain.id,
      walletAddress: queuedTransaction.fromAddress,
    });
    const account = await ethers5Adapter.signer.fromEthers({
      signer: wallet.getSigner(),
    });

    // Get signer.

    // Prepare transaction + acquire a unique nonce.
    const value = await this.getValue(queuedTransaction);
    const nonce = await this.getNonce({
      backendWalletAddress: queuedTransaction.fromAddress,
      chain,
    });
    let preparedTransaction: PreparedTransaction | undefined;
    try {
      preparedTransaction = prepareTransaction({
        client: thirdwebClient,
        chain,
        to: queuedTransaction.toAddress,
        data: queuedTransaction.data as `0x${string}`,
        value,
        nonce,
      });
    } catch (e) {
      // This transaction is expected to fail onchain.
      // @TODO: flag tx as errored.
      return;
    }

    // Send transaction to RPC.
    let transactionHash: `0x${string}`;
    try {
      const result = await sendTransaction({
        transaction: preparedTransaction,
        account,
      });
      transactionHash = result.transactionHash;
    } catch (e) {
      // RPC returned an error.
      // @TODO: flag tx as errored.
      return;
    }

    // Add event to SentQueue.
    const sentTransaction = await this.getSentTransaction({
      queuedTransaction,
      preparedTransaction,
      transactionHash,
      chain,
    });
    await SentTransactionQueue.add({ sentTransaction });

    // Update the transactions DB.
  };

  /**
   * Prepares and sends a userOp to RPC.
   * @param queuedTransaction QueuedTransaction
   */
  handleUserOp = async (queuedTransaction: QueuedTransaction) => {
    // @TODO
    console.error("UNIMPLEMENTED");
  };

  /**
   *
   * @param args
   * @returns SentTransaction
   * @async
   */
  private getSentTransaction = async (args: {
    preparedTransaction: PreparedTransaction;
    queuedTransaction: QueuedTransaction;
    transactionHash: `0x${string}`;
    chain: Chain;
  }): Promise<SentTransaction> => {
    const { preparedTransaction, queuedTransaction, transactionHash, chain } =
      args;
    const rpcRequest = getRpcClient({ client: thirdwebClient, chain });

    const sentAt = new Date();
    const sentAtBlock = await eth_blockNumber(rpcRequest);
    const gas = await resolvePromisedValue(preparedTransaction.gas);
    if (!gas) {
      throw new Error('Prepared transaction missing "gas".');
    }
    const nonce = await resolvePromisedValue(preparedTransaction.nonce);
    if (!nonce) {
      throw new Error('Prepared transaction missing "nonce".');
    }

    const gasPrice = await resolvePromisedValue(preparedTransaction.gasPrice);
    const maxFeePerGas = await resolvePromisedValue(
      preparedTransaction.maxFeePerGas,
    );
    const maxPriorityFeePerGas = await resolvePromisedValue(
      preparedTransaction.maxPriorityFeePerGas,
    );
    const gasOptions = gasPrice
      ? { gasPrice }
      : maxFeePerGas && maxPriorityFeePerGas
      ? { maxFeePerGas, maxPriorityFeePerGas }
      : undefined;
    if (!gasOptions) {
      throw new Error("Prepared transaction missing gas price.");
    }

    return {
      ...queuedTransaction,
      ...gasOptions,
      sentAt,
      sentAtBlock,
      gas,
      nonce,
      transactionHash,
    };
  };

  /**
   * Get the "value" field for the transaction.
   * @param tx QueuedTransaction
   * @returns bigint The value to send in this transaction.
   * @async
   */
  private getValue = async (tx: QueuedTransaction): Promise<bigint> => {
    const { extension, fromAddress, toAddress, chainId } = tx;

    if (extension === "withdraw") {
      if (!fromAddress || !toAddress) {
        throw new Error("Withdraw tx missing required fields.");
      }
      const chain = defineChain(chainId);

      // Get wallet balance.
      const { value: balanceWei } = await getWalletBalance({
        address: fromAddress,
        client: thirdwebClient,
        chain,
      });

      // Estimate gas for a transfer.
      const transferTx = prepareTransaction({
        client: thirdwebClient,
        chain,
        value: BigInt(1),
        to: toAddress,
      });
      const { wei: transferCostWei } = await estimateGasCost({
        transaction: transferTx,
      });

      // Add a 20% buffer for gas variance.
      const buffer = BigInt(Math.round(Number(transferCostWei) * 0.2));
      return balanceWei - transferCostWei - buffer;
    }

    return BigInt(tx.value);
  };

  /**
   * Gets the next nonce for the given wallet+chain.
   * @param args.backendWalletAddress string The backend wallet address broadcasting the tx.
   * @param args.chainId number
   * @async
   */
  private getNonce = async (args: {
    backendWalletAddress: string;
    chain: Chain;
  }): Promise<number> => {
    const { backendWalletAddress, chain } = args;

    const key = `nonce:${chain.id}:${backendWalletAddress.toLowerCase()}}`;
    const nonce = await redis.incr(key);

    // If nonce === 1, confirm if the wallet has no onchain transactions.
    // If not, sync Redis with the existing wallet nonce.
    // This is only a performance hit on the first tx per wallet+chain.
    if (nonce === 1) {
      // @TODO: How can we handle an initial burst of txs on a prexisting wallet?
    }

    return nonce;
  };
}
