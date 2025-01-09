import { Worker, type Job, type Processor } from "bullmq";
import assert from "node:assert";
import superjson from "superjson";
import {
  getAddress,
  getContract,
  readContract,
  toSerializableTransaction,
  toTokens,
  type Hex,
} from "thirdweb";
import { getChainMetadata } from "thirdweb/chains";
import { isZkSyncChain, stringify } from "thirdweb/utils";
import type { Account } from "thirdweb/wallets";
import {
  bundleUserOp,
  createAndSignUserOp,
  smartWallet,
  type UserOperation,
} from "thirdweb/wallets/smart";
import { getContractAddress } from "viem";
import { TransactionDB } from "../../shared/db/transactions/db";
import {
  acquireNonce,
  addSentNonce,
  recycleNonce,
  syncLatestNonceFromOnchainIfHigher,
} from "../../shared/db/wallets/wallet-nonce";
import {
  getAccount,
  getSmartBackendWalletAdminAccount,
} from "../../shared/utils/account";
import { getBlockNumberish } from "../../shared/utils/block";
import { getChain } from "../../shared/utils/chain";
import { msSince } from "../../shared/utils/date";
import { env } from "../../shared/utils/env";
import {
  isInsufficientFundsError,
  isNonceAlreadyUsedError,
  isReplacementGasFeeTooLow,
  wrapError,
} from "../../shared/utils/error";
import { BigIntMath } from "../../shared/utils/math";
import { getChecksumAddress } from "../../shared/utils/primitive-types";
import { recordMetrics } from "../../shared/utils/prometheus";
import { redis } from "../../shared/utils/redis/redis";
import { thirdwebClient } from "../../shared/utils/sdk";
import type {
  ErroredTransaction,
  PopulatedTransaction,
  QueuedTransaction,
  SentTransaction,
} from "../../shared/utils/transaction/types";
import { enqueueTransactionWebhook } from "../../shared/utils/transaction/webhook";
import { reportUsage } from "../../shared/utils/usage";
import { MineTransactionQueue } from "../queues/mine-transaction-queue";
import { logWorkerExceptions } from "../queues/queues";
import {
  SendTransactionQueue,
  type SendTransactionData,
} from "../queues/send-transaction-queue";

/**
 * Submit a transaction to RPC (EOA transactions) or bundler (userOps).
 *
 * This worker also handles retried EOA transactions.
 */
const handler: Processor<string, void, string> = async (job: Job<string>) => {
  const { queueId, resendCount } = superjson.parse<SendTransactionData>(
    job.data,
  );

  const transaction = await TransactionDB.get(queueId);
  if (!transaction) {
    job.log(`Invalid transaction state: ${stringify(transaction)}`);
    return;
  }

  let resultTransaction:
    | SentTransaction // Transaction sent successfully.
    | ErroredTransaction // Transaction failed and will not be retried.
    | null; // No attempt to send is made.
  // This job may also throw to indicate an unexpected error that will be retried.

  if (transaction.status === "queued") {
    if (transaction.isUserOp) {
      resultTransaction = await _sendUserOp(job, transaction);
    } else {
      resultTransaction = await _sendTransaction(job, transaction);
    }
  } else if (transaction.status === "sent") {
    resultTransaction = await _resendTransaction(job, transaction, resendCount);
  } else {
    job.log(`Invalid transaction state: ${stringify(transaction)}`);
    return;
  }

  if (resultTransaction) {
    await TransactionDB.set(resultTransaction);

    if (resultTransaction.status === "sent") {
      job.log(`Transaction sent: ${stringify(resultTransaction)}.`);
      if (resendCount === 0) {
        await MineTransactionQueue.add({ queueId: resultTransaction.queueId });
        await enqueueTransactionWebhook(resultTransaction);
        await _reportSuccess(resultTransaction);
      }
    } else if (resultTransaction.status === "errored") {
      job.log(`Transaction errored: ${stringify(resultTransaction)}.`);
      await enqueueTransactionWebhook(resultTransaction);
      _reportError(resultTransaction);
    }
  }
};

const _sendUserOp = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | ErroredTransaction | null> => {
  assert(queuedTransaction.isUserOp);

  if (_hasExceededTimeout(queuedTransaction)) {
    // Fail if the transaction is not sent within the specified timeout.
    return {
      ...queuedTransaction,
      status: "errored",
      errorMessage: `Exceeded ${queuedTransaction.timeoutSeconds}s timeout`,
    };
  }

  const {
    from,
    accountAddress,
    to,
    target,
    chainId,
    accountFactoryAddress: userProvidedAccountFactoryAddress,
    entrypointAddress: userProvidedEntrypointAddress,
    accountSalt,
    overrides,
  } = queuedTransaction;
  const chain = await getChain(chainId);

  assert(accountAddress, "Invalid userOp parameters: accountAddress");
  const toAddress = to ?? target;
  assert(toAddress, "Invalid transaction parameters: to");

  // this can either be a regular backend wallet userop or a smart backend wallet userop
  let adminAccount: Account | undefined;

  try {
    adminAccount = await getSmartBackendWalletAdminAccount({
      accountAddress,
      chainId: chainId,
    });
  } catch {
    // do nothing, this might still be a regular backend wallet userop
  }

  if (!adminAccount) {
    adminAccount = await getAccount({
      chainId: chainId,
      from,
    });
  }

  if (!adminAccount) {
    job.log("Failed to find admin account for userop");
    return {
      ...queuedTransaction,
      status: "errored",
      errorMessage: "Failed to find admin account for userop",
    };
  }

  let signedUserOp: UserOperation;
  try {
    // Resolve the user factory from the provided address, or from the `factory()` method if found.
    let accountFactoryAddress = userProvidedAccountFactoryAddress;
    if (!accountFactoryAddress) {
      // TODO: this is not a good solution since the assumption that the account has a factory function is not guaranteed
      // instead, we should use default account factory address or throw here.
      try {
        const smartAccountContract = getContract({
          client: thirdwebClient,
          chain,
          address: accountAddress,
        });
        const onchainAccountFactoryAddress = await readContract({
          contract: smartAccountContract,
          method: "function factory() view returns (address)",
          params: [],
        });
        accountFactoryAddress = getAddress(onchainAccountFactoryAddress);
      } catch {
        throw new Error(
          `Failed to find factory address for account '${accountAddress}' on chain '${chainId}'`,
        );
      }
    }

    signedUserOp = (await createAndSignUserOp({
      client: thirdwebClient,
      transactions: [
        {
          client: thirdwebClient,
          chain,
          ...queuedTransaction,
          ...overrides,
          to: getChecksumAddress(toAddress),
        },
      ],
      adminAccount,
      smartWalletOptions: {
        chain,
        sponsorGas: true,
        factoryAddress: accountFactoryAddress,
        overrides: {
          accountAddress,
          accountSalt,
          entrypointAddress: userProvidedEntrypointAddress,
          // TODO: let user pass entrypoint address for 0.7 support
        },
      },
      // don't wait for the account to be deployed between userops
      // making this true will cause issues since it will block this call
      // until the previous userop for the same account is mined
      // we don't want this behavior in the engine context
      waitForDeployment: false,
    })) as UserOperation; // TODO support entrypoint v0.7 accounts
  } catch (error) {
    const errorMessage = wrapError(error, "Bundler").message;
    const erroredTransaction: ErroredTransaction = {
      ...queuedTransaction,
      status: "errored",
      errorMessage,
    };
    job.log(`Failed to populate transaction: ${errorMessage}`);
    return erroredTransaction;
  }

  job.log(`Populated userOp: ${stringify(signedUserOp)}`);

  const userOpHash = await bundleUserOp({
    userOp: signedUserOp,
    options: {
      client: thirdwebClient,
      chain,
      entrypointAddress: userProvidedEntrypointAddress,
    },
  });

  return {
    ...queuedTransaction,
    isUserOp: true,
    status: "sent",
    nonce: signedUserOp.nonce.toString(),
    userOpHash,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(queuedTransaction.chainId),
    gas: signedUserOp.callGasLimit,
    maxFeePerGas: signedUserOp.maxFeePerGas,
    maxPriorityFeePerGas: signedUserOp.maxPriorityFeePerGas,
  };
};

const _sendTransaction = async (
  job: Job,
  queuedTransaction: QueuedTransaction,
): Promise<SentTransaction | ErroredTransaction | null> => {
  assert(!queuedTransaction.isUserOp);

  if (_hasExceededTimeout(queuedTransaction)) {
    // Fail if the transaction is not sent within the specified timeout.
    return {
      ...queuedTransaction,
      status: "errored",
      errorMessage: `Exceeded ${queuedTransaction.timeoutSeconds}s timeout`,
    };
  }

  const { queueId, chainId, from, to, overrides } = queuedTransaction;
  const chain = await getChain(chainId);

  const ownerAccount = await getAccount({
    chainId: chainId,
    from: from,
  });

  let account: Account;

  if (queuedTransaction.transactionMode === "sponsored") {
    if (!isZkSyncChain(chain)) {
      job.log(
        "Sponsored EOA transactions are only supported on zkSync chains.",
      );
      const erroredTransaction: ErroredTransaction = {
        ...queuedTransaction,
        status: "errored",
        errorMessage:
          "Sponsored EOA transactions are only supported on zkSync chains.",
      };
      return erroredTransaction;
    }

    account = await smartWallet({ chain, sponsorGas: true }).connect({
      personalAccount: ownerAccount,
      client: thirdwebClient,
    });
  }

  // If no account was provided, use the owner account.
  account ??= ownerAccount;

  // Populate the transaction to resolve gas values.
  // This call throws if the execution would be reverted.
  // The nonce is _not_ set yet.

  let populatedTransaction: PopulatedTransaction;
  try {
    populatedTransaction = await toSerializableTransaction({
      from: getChecksumAddress(from),
      transaction: {
        client: thirdwebClient,
        chain,
        ...queuedTransaction,
        to: getChecksumAddress(to),
        // Use a dummy nonce since we override it later.
        nonce: 1,

        // Apply gas setting overrides.
        // Do not set `maxFeePerGas` to estimate the onchain value.
        gas: overrides?.gas,
        gasPrice: overrides?.gasPrice,
        maxPriorityFeePerGas: overrides?.maxPriorityFeePerGas,
      },
    });
  } catch (error: unknown) {
    const errorMessage = wrapError(error, "RPC").message;
    const erroredTransaction: ErroredTransaction = {
      ...queuedTransaction,
      status: "errored",
      errorMessage,
    };
    job.log(`Failed to populate transaction: ${errorMessage}`);
    return erroredTransaction;
  }

  // Handle if `maxFeePerGas` is overridden.
  // Set it if the transaction will be sent, otherwise delay the job.
  if (overrides?.maxFeePerGas && populatedTransaction.maxFeePerGas) {
    if (overrides.maxFeePerGas > populatedTransaction.maxFeePerGas) {
      populatedTransaction.maxFeePerGas = overrides.maxFeePerGas;
    } else {
      const retryAt = _minutesFromNow(5);
      job.log(
        `Override gas fee (${overrides.maxFeePerGas}) is lower than onchain fee (${populatedTransaction.maxFeePerGas}). Delaying job until ${retryAt}.`,
      );
      await job.moveToDelayed(retryAt.getTime());
      return null;
    }
  }

  // Acquire an unused nonce for this transaction.
  const { nonce, isRecycledNonce } = await acquireNonce({
    queueId,
    chainId,
    walletAddress: from,
  });
  populatedTransaction.nonce = nonce;
  job.log(
    `Populated transaction (isRecycledNonce=${isRecycledNonce}): ${stringify(populatedTransaction)}`,
  );

  // Send transaction to RPC.
  // This call throws if the RPC rejects the transaction.
  let transactionHash: Hex;
  try {
    const sendTransactionResult =
      await account.sendTransaction(populatedTransaction);
    transactionHash = sendTransactionResult.transactionHash;
  } catch (error: unknown) {
    // If the nonce is already seen onchain (nonce too low) or in mempool (replacement underpriced),
    // correct the DB nonce.
    if (isNonceAlreadyUsedError(error) || isReplacementGasFeeTooLow(error)) {
      const result = await syncLatestNonceFromOnchainIfHigher(chainId, from);
      job.log(`Re-synced nonce: ${result}`);
    } else {
      // Otherwise this nonce is not used yet. Recycle it to be used by a future transaction.
      job.log(`Recycling nonce: ${nonce}`);
      await recycleNonce(chainId, from, nonce);
    }

    // Do not retry errors that are expected to be rejected by RPC again.
    if (isInsufficientFundsError(error)) {
      const { name, nativeCurrency } = await getChainMetadata(chain);
      const { gas, value = 0n } = populatedTransaction;
      const gasPrice =
        populatedTransaction.gasPrice ?? populatedTransaction.maxFeePerGas;

      const minGasTokens = gasPrice
        ? toTokens(gas * gasPrice + value, 18)
        : null;
      const errorMessage = minGasTokens
        ? `Insufficient funds in ${account.address} on ${name}. Transaction requires > ${minGasTokens} ${nativeCurrency.symbol}.`
        : `Insufficient funds in ${account.address} on ${name}. Transaction requires more ${nativeCurrency.symbol}.`;
      return {
        ...queuedTransaction,
        status: "errored",
        errorMessage,
      } satisfies ErroredTransaction;
    }

    throw wrapError(error, "RPC");
  }

  await addSentNonce(chainId, from, nonce);

  return {
    ...queuedTransaction,
    status: "sent",
    isUserOp: false,
    nonce,
    sentTransactionHashes: [transactionHash],
    resendCount: 0,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    gas: populatedTransaction.gas,
    gasPrice: populatedTransaction.gasPrice,
    maxFeePerGas: populatedTransaction.maxFeePerGas,
    maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
    deployedContractAddress: _resolveDeployedContractAddress(
      queuedTransaction,
      nonce,
    ),
  };
};

const _resendTransaction = async (
  job: Job,
  sentTransaction: SentTransaction,
  resendCount: number,
): Promise<SentTransaction | null> => {
  assert(!sentTransaction.isUserOp);

  if (_hasExceededTimeout(sentTransaction)) {
    // Don't resend past the timeout. A transaction in mempool may still be mined later.
    return null;
  }

  // Populate the transaction with double gas.
  const { chainId, from, overrides, sentTransactionHashes } = sentTransaction;
  let populatedTransaction = await toSerializableTransaction({
    from: getChecksumAddress(from),
    transaction: {
      client: thirdwebClient,
      chain: await getChain(chainId),
      ...sentTransaction,
      // Use overrides, if any.
      // If no overrides, set to undefined so gas settings can be re-populated.
      gas: overrides?.gas,
      maxFeePerGas: overrides?.maxFeePerGas,
      maxPriorityFeePerGas: overrides?.maxPriorityFeePerGas,
    },
  });

  // Increase gas fees for this resend attempt.
  populatedTransaction = _updateGasFees(
    populatedTransaction,
    sentTransaction.resendCount + 1,
    sentTransaction.overrides,
  );

  job.log(`Populated transaction: ${stringify(populatedTransaction)}`);

  // Send transaction to RPC.
  // This call throws if the RPC rejects the transaction.
  let transactionHash: Hex;
  try {
    const account = await getAccount({ chainId, from });
    const result = await account.sendTransaction(populatedTransaction);
    transactionHash = result.transactionHash;
  } catch (error) {
    if (isNonceAlreadyUsedError(error)) {
      job.log(
        "Nonce used. This transaction was likely already mined. Do not resend.",
      );
      return null;
    }
    if (isReplacementGasFeeTooLow(error)) {
      job.log("A pending transaction exists with >= gas fees. Do not resend.");
      return null;
    }
    throw wrapError(error, "RPC");
  }

  return {
    ...sentTransaction,
    resendCount,
    sentAt: new Date(),
    sentAtBlock: await getBlockNumberish(chainId),
    // Dedupe transaction hashes.
    sentTransactionHashes: [
      ...new Set([...sentTransactionHashes, transactionHash]),
    ],
    gas: populatedTransaction.gas,
    gasPrice: populatedTransaction.gasPrice,
    maxFeePerGas: populatedTransaction.maxFeePerGas,
    maxPriorityFeePerGas: populatedTransaction.maxPriorityFeePerGas,
  };
};

const _reportSuccess = async (sentTransaction: SentTransaction) => {
  const chain = await getChain(sentTransaction.chainId);
  reportUsage([
    {
      action: "send_tx",
      input: {
        ...sentTransaction,
        provider: chain.rpc,
        msSinceQueue: msSince(sentTransaction.queuedAt),
      },
    },
  ]);
  recordMetrics({
    event: "transaction_sent",
    params: {
      chainId: sentTransaction.chainId.toString(),
      success: true,
      walletAddress: getAddress(sentTransaction.from),
      durationSeconds: msSince(sentTransaction.queuedAt) / 1000,
    },
  });
};

const _reportError = (erroredTransaction: ErroredTransaction) => {
  reportUsage([
    {
      action: "error_tx",
      input: {
        ...erroredTransaction,
        msSinceQueue: msSince(erroredTransaction.queuedAt),
      },
      error: erroredTransaction.errorMessage,
    },
  ]);
  recordMetrics({
    event: "transaction_sent",
    params: {
      chainId: erroredTransaction.chainId.toString(),
      success: false,
      walletAddress: getAddress(erroredTransaction.from),
      durationSeconds: msSince(erroredTransaction.queuedAt) / 1000,
    },
  });
};

const _resolveDeployedContractAddress = (
  queuedTransaction: QueuedTransaction,
  nonce: number,
) => {
  if (queuedTransaction.deployedContractAddress) {
    return queuedTransaction.deployedContractAddress;
  }

  if (
    queuedTransaction.extension === "deploy-published" &&
    queuedTransaction.functionName === "deploy"
  ) {
    return getContractAddress({
      from: queuedTransaction.from,
      nonce: BigInt(nonce),
    });
  }
};

const _hasExceededTimeout = (
  transaction: QueuedTransaction | SentTransaction,
) =>
  transaction.timeoutSeconds !== undefined &&
  msSince(transaction.queuedAt) / 1000 > transaction.timeoutSeconds;

const _minutesFromNow = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000);

/**
 * Computes aggressive gas fees when resending a transaction.
 *
 * For legacy transactions (pre-EIP1559):
 * - Gas price = (2 * attempt) * estimatedGasPrice, capped at 10x.
 *
 * For other transactions:
 * - maxPriorityFeePerGas = (2 * attempt) * estimatedMaxPriorityFeePerGas, capped at 10x.
 * - maxFeePerGas = (2 * estimatedMaxFeePerGas) + maxPriorityFeePerGas.
 *
 * @param populatedTransaction The transaction with estimated gas from RPC.
 * @param resendCount The resend attempt #. Example: 2 = the transaction was initially sent, then resent once. This is the second resend attempt.
 */
export function _updateGasFees(
  populatedTransaction: PopulatedTransaction,
  resendCount: number,
  overrides: SentTransaction["overrides"],
): PopulatedTransaction {
  if (resendCount === 0) {
    return populatedTransaction;
  }

  const multiplier = BigIntMath.min(10n, BigInt(resendCount) * 2n);
  const updated = { ...populatedTransaction };

  // Update gas fees (unless they were explicitly overridden).
  // Do not exceed MAX_GAS_PRICE_WEI.
  const MAX_GAS_PRICE_WEI = BigInt(env.EXPERIMENTAL__MAX_GAS_PRICE_WEI);

  if (updated.gasPrice && !overrides?.gasPrice) {
    const newGasPrice = updated.gasPrice * multiplier;
    updated.gasPrice = BigIntMath.min(newGasPrice, MAX_GAS_PRICE_WEI);
  }
  if (updated.maxPriorityFeePerGas && !overrides?.maxPriorityFeePerGas) {
    updated.maxPriorityFeePerGas *= multiplier;
  }
  if (updated.maxFeePerGas && !overrides?.maxFeePerGas) {
    const newMaxFeePerGas =
      updated.maxFeePerGas * 2n + (updated.maxPriorityFeePerGas ?? 0n);
    updated.maxFeePerGas = BigIntMath.min(newMaxFeePerGas, MAX_GAS_PRICE_WEI);
  }

  return updated;
}

// Must be explicitly called for the worker to run on this host.
export const initSendTransactionWorker = () => {
  const _worker = new Worker(SendTransactionQueue.q.name, handler, {
    concurrency: env.SEND_TRANSACTION_QUEUE_CONCURRENCY,
    connection: redis,
  });
  logWorkerExceptions(_worker);

  // If a transaction fails to send after all retries, error it.
  _worker.on("failed", async (job: Job<string> | undefined, error: Error) => {
    if (job && job.attemptsMade === job.opts.attempts) {
      const { queueId } = superjson.parse<SendTransactionData>(job.data);
      const transaction = await TransactionDB.get(queueId);
      if (transaction) {
        const erroredTransaction: ErroredTransaction = {
          ...transaction,
          status: "errored",
          errorMessage: error.message,
        };
        job.log(`Transaction errored: ${stringify(erroredTransaction)}`);

        await TransactionDB.set(erroredTransaction);
        await enqueueTransactionWebhook(erroredTransaction);
        _reportError(erroredTransaction);
      }
    }
  });
};
