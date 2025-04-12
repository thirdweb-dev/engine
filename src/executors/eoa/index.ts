import {
  eth_getTransactionCount,
  eth_getTransactionReceipt,
  getRpcClient,
  prepareTransaction,
  serializeTransaction,
  toSerializableTransaction,
  type Address,
  type Chain,
  type Hex,
} from "thirdweb";
import { initializeLogger } from "../../lib/logger.js";
import { Queue, UnrecoverableError, Worker, type Job } from "bullmq";
import { redis } from "../../lib/redis.js";
import { getEngineAccount } from "../../lib/accounts/accounts.js";
import { getChain } from "../../lib/chain.js";
import { thirdwebClient } from "../../lib/thirdweb-client.js";
import {
  getNonceState,
  incrementEngineNonce,
  resetNonceState,
  setConfirmedNonceMax,
  recycleNonce,
  type NonceDbErr,
  popRecycledNonce,
  checkMissingNonces,
} from "./nonce.js";
import { ResultAsync, safeTry, ok, err, okAsync, errAsync } from "neverthrow";
import SuperJSON from "superjson";
import {
  accountActionErrorMapper,
  isEngineErr,
  type AccountActionErr,
  type AccountErr,
  type EngineErr,
  type RpcErr,
} from "../../lib/errors.js";
import { keccak256 } from "ox/Hash";
import type { TransactionReceipt } from "thirdweb/transaction";
import { checkEoaIssues, type EoaIssues, setOutOfGasIssue } from "./issues.js";
import { recordTransactionAttempt } from "./attempts.js";

const sendLogger = initializeLogger("executor:eoa:send");
const confirmLogger = initializeLogger("executor:eoa:confirm");
const resetLogger = initializeLogger("executor:eoa:reset");
const healLogger = initializeLogger("executor:eoa:heal");

const MAX_IN_FLIGHT = 100;
const MAX_RECYCLED_COUNT = 100;

type ExecutionRequest = {
  id: string;
  executionOptions: {
    accountAddress: Address;
    // add gas overrides
  };
  chainId: string;
  transactionParams: {
    to: Address;
    data: Hex;
    value: string;
  };
};

export type ExecutionResult = {
  id: string;
  transactionHash: Hex;
  chainId: string;
};

export type ConfirmationResult = {
  id: string;
  transactionHash: Hex;
  blockNumber: bigint;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  status: "success" | "reverted";
};

type NonceResetRequest = {
  address: Address;
  chainId: string;
};

type SendJobClearRequest = {
  id: string;
  attempt: number;
};

type NonceHoleHealingRequest = {
  address: Address;
  chainId: string;
};

export type QueueingErr = {
  kind: "queue";
  code:
    | "eoa:queuing_send_job_failed"
    | "eoa:queuing_confirm_job_failed"
    | "eoa:queuing_nonce_reset_job_failed"
    | "eoa:queuing_send_job_clear_job_failed"
    | "eoa:queuing_nonce_hole_healing_job_failed";
  source: Error;
};

// Callbacks for confirmation results
const callbacks: ((result: ConfirmationResult) => void)[] = [];

export function registerCallback(
  callback: (result: ConfirmationResult) => void,
) {
  confirmLogger.info(`Registered callback ${callback.name}`);
  callbacks.push(callback);
}

export const EOA_SEND_QUEUE_NAME = "executor-eoa-send";
export const EOA_CONFIRM_QUEUE_NAME = "executor-eoa-confirm";
export const EOA_NONCE_RESET_QUEUE_NAME = "executor-eoa-nonce_reset";
export const EOA_SEND_JOB_CLEAR_QUEUE_NAME = "executor-eoa-send_job_clear";
export const EOA_NONCE_HOLE_HEALING_QUEUE_NAME =
  "executor-eoa-nonce_hole_healing";

export const eoaSendQueue = new Queue<ExecutionRequest>(EOA_SEND_QUEUE_NAME, {
  defaultJobOptions: {
    attempts: 60,
    backoff: {
      type: "fixed",
      delay: 1000,
    },
  },
  connection: redis,
});

export const eoaConfirmQueue = new Queue<ExecutionResult>(
  EOA_CONFIRM_QUEUE_NAME,
  {
    defaultJobOptions: {
      attempts: 60,
      backoff: {
        type: "custom",
      },
    },
    connection: redis,
  },
);

export const eoaNonceResetQueue = new Queue<NonceResetRequest>(
  EOA_NONCE_RESET_QUEUE_NAME,
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
    connection: redis,
  },
);

export const eoaSendJobClearQueue = new Queue<SendJobClearRequest>(
  EOA_SEND_JOB_CLEAR_QUEUE_NAME,
  {
    connection: redis,
  },
);

export const eoaNonceHoleHealingQueue = new Queue<NonceHoleHealingRequest>(
  EOA_NONCE_HOLE_HEALING_QUEUE_NAME,
  {
    connection: redis,
  },
);

export function execute(request: ExecutionRequest) {
  return ResultAsync.fromPromise(
    eoaSendQueue.add(request.id, request, {
      jobId: request.id,
    }),
    (err) =>
      ({
        code: "eoa:queuing_send_job_failed",
        kind: "queue",
        executionOptions: request.executionOptions,
        source: err,
      }) as QueueingErr,
  );
}

// Helper function to queue a nonce reset job
function queueNonceReset(address: Address, chainId: string, job: Job) {
  const resetJobId = `reset_${address}_${chainId}`;
  return ResultAsync.fromPromise(
    eoaNonceResetQueue.add(
      resetJobId,
      { address, chainId },
      { jobId: resetJobId },
    ),
    (err) =>
      ({
        kind: "queue",
        code: "eoa:queuing_nonce_reset_job_failed",
        source: err,
      }) as QueueingErr,
  )
    .mapErr((err) => {
      job.log(
        `[${new Date().toISOString()}] Failed to queue nonce reset: ${err}`,
      );
      sendLogger.error("Failed to queue nonce reset", err);
      return err;
    })
    .andTee(() => {
      job.log(
        `[${new Date().toISOString()}] Queued nonce reset job ${resetJobId}`,
      );
      sendLogger.info("Queued nonce reset job", { address, chainId });
    });
}

// Worker dedicated to handling nonce resets in a deduplicated way
export const nonceResetWorker = new Worker<NonceResetRequest, boolean>(
  EOA_NONCE_RESET_QUEUE_NAME,
  async (job) => {
    const { address, chainId } = job.data;
    resetLogger.info("Processing nonce reset", { address, chainId });
    job.log(`[${new Date().toISOString()}] Starting nonce reset`);

    const chain = await getChain(Number(chainId));
    const rpcRequest = getRpcClient({
      chain,
      client: thirdwebClient,
    });

    const result = await safeTry(async function* () {
      const newNonce = yield* ResultAsync.fromPromise(
        eth_getTransactionCount(rpcRequest, { address }),
        (err) =>
          ({
            code: "get_transaction_count_failed",
            kind: "rpc",
            status: 500,
            address,
            chainId,
            source: err as Error,
          }) as RpcErr,
      );

      job.log(`[${new Date().toISOString()}] Fetched new nonce: ${newNonce}`);
      resetLogger.info("Fetched new nonce from chain", {
        address,
        chainId,
        nonce: newNonce,
      });

      const resetResult = yield* resetNonceState(address, chainId, newNonce);

      job.log(
        `[${new Date().toISOString()}] Successfully reset nonce state with nonce: ${newNonce}`,
      );
      resetLogger.info("Successfully reset nonce state", {
        address,
        chainId,
        nonce: newNonce,
      });

      return okAsync(resetResult);
    });

    if (result.isErr()) {
      job.log(
        `[${new Date().toISOString()}] Failed to reset nonce state: ${
          result.error
        }`,
      );
      resetLogger.error("Failed to reset nonce state", result.error);
      throw result.error.source ?? new Error(result.error.code);
    }

    return result.value;
  },
  {
    connection: redis,
  },
);

// Worker dedicated to clearing send jobs in a deduplicated way
// We cannot rely on delaying jobs when they fail because this causes queue contention
// instead we insert a new job with the same id and incremented attempt number
// then we error the old job in a way that does not cause it to be retried
// a job cannot remove itself from the queue, so we rely on this worker to do it
export const sendJobClearWorker = new Worker<SendJobClearRequest, boolean>(
  EOA_SEND_JOB_CLEAR_QUEUE_NAME,
  async (job) => {
    const { id, attempt } = job.data;

    const oldJobId = `${id}_attempt-${attempt}`;
    const newJobId = `${id}_attempt-${attempt + 1}`;

    const newJob = await eoaSendQueue.getJob(newJobId);

    if (newJob) {
      await eoaSendQueue.remove(oldJobId);
      return true;
    }

    throw new Error(
      `Not clearing job ${oldJobId} because new job ${newJobId} does not exist. Will retry`,
    );
  },
  {
    connection: redis,
  },
);

// Custom error types for better error handling
export type EoaTransactionError =
  | NonceDbErr
  | AccountActionErr
  | TransactionSendError;

export type TransactionSendError = {
  kind: "transaction_send";
  code:
    | "gas_too_low"
    | "insufficient_funds"
    | "nonce_too_low"
    | "nonce_too_high"
    | "replacement_underpriced"
    | "already_known"
    | "unknown_rpc_error";
  status: number;
  address: Address;
  chainId: string;
  nonce?: number;
  message: string;
  source?: Error;
};

export type PreSendCheckFailedErr = {
  kind: "pre_send_check_failed";
  code: "too_many_recycled" | "too_many_inflight" | "eoa_issue";
  issues?: EoaIssues;
};

// RPC error mapper for transaction errors
function mapTransactionSendError(
  error: unknown,
  context: {
    address: Address;
    chainId: string;
    nonce?: number;
  },
): TransactionSendError | EngineErr {
  if (isEngineErr(error)) {
    return error;
  }

  const errorMessageAnyCase =
    error instanceof Error ? error.message : String(error);
  const errorMessage = errorMessageAnyCase.toLowerCase();
  const { address, chainId, nonce } = context;

  // Check for nonce-related errors
  if (errorMessage.includes("nonce too low")) {
    return {
      kind: "transaction_send",
      code: "nonce_too_low",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Nonce too low: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  if (errorMessage.includes("nonce too high")) {
    return {
      kind: "transaction_send",
      code: "nonce_too_high",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Nonce too high: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  if (errorMessage.includes("replacement transaction underpriced")) {
    return {
      kind: "transaction_send",
      code: "replacement_underpriced",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Replacement transaction underpriced: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  if (errorMessage.includes("already known")) {
    return {
      kind: "transaction_send",
      code: "already_known",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Transaction already known: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  // Check for gas-related errors
  if (errorMessage.includes("insufficient funds")) {
    return {
      kind: "transaction_send",
      code: "insufficient_funds",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Insufficient funds: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  if (
    errorMessage.includes("gas too low") ||
    errorMessage.includes("intrinsic gas")
  ) {
    return {
      kind: "transaction_send",
      code: "gas_too_low",
      status: 400,
      address,
      chainId,
      nonce,
      message: `Gas too low: ${errorMessage}`,
      source: error instanceof Error ? error : undefined,
    };
  }

  // Default to unknown RPC error
  return {
    kind: "transaction_send",
    code: "unknown_rpc_error",
    status: 500,
    address,
    chainId,
    nonce,
    message: `RPC error: ${errorMessage}`,
    source: error instanceof Error ? error : undefined,
  };
}

function syncConfirmedNonce(address: Address, chain: Chain) {
  const rpcRequest = getRpcClient({
    chain,
    client: thirdwebClient,
  });

  return ResultAsync.fromPromise(
    eth_getTransactionCount(rpcRequest, {
      address,
    }),
    (error): RpcErr => ({
      kind: "rpc",
      code: "get_transaction_count_failed",
      status: 500,
      address,
      chainId: chain.id.toString(),
      source: error instanceof Error ? error : undefined,
    }),
  ).andThen((fetchedConfirmedNonce) =>
    setConfirmedNonceMax(address, chain.id.toString(), fetchedConfirmedNonce),
  );
}

export const nonceHoleHealingWorker = new Worker<
  NonceHoleHealingRequest,
  boolean
>(
  EOA_NONCE_HOLE_HEALING_QUEUE_NAME,
  async (job) => {
    const { address, chainId } = job.data;

    const chain = getChain(Number(chainId));

    healLogger.info("Processing nonce hole healing", {
      address,
      chainId,
    });

    const result = await safeTry(async function* () {
      // Verify confirmed nonce from chain
      const { confirmedNonce, engineNonce } = yield* syncConfirmedNonce(
        address,
        chain,
      );

      if (engineNonce - confirmedNonce < MAX_IN_FLIGHT) {
        return okAsync(true);
      }

      const missingNoncesResult = await checkMissingNonces(address, chainId);

      if (missingNoncesResult.isErr()) {
        if (missingNoncesResult.error.code === "too_many_missing_nonces") {
          yield* queueNonceReset(address, chainId, job);
          return okAsync(true);
        }
        return errAsync(missingNoncesResult.error);
      }

      const missingNonces = missingNoncesResult.value;
      const nonceState = yield* getNonceState(address, chainId);

      if (
        nonceState.recycledCount + missingNonces.length >
        MAX_RECYCLED_COUNT
      ) {
        yield* queueNonceReset(address, chainId, job);
        return okAsync(true);
      }

      for (const nonce of missingNonces) {
        yield* recycleNonce(address, chainId, nonce, nonceState.epoch);
      }

      return okAsync(true);
    });

    if (result.isErr()) {
      healLogger.error("Failed to process nonce hole healing", result.error);
      throw result.error.source ?? new Error(result.error.code);
    }

    return result.value;
  },
  { connection: redis },
);

function queueNonceHoleHealing(address: Address, chainId: string, job: Job) {
  job.log(`[${new Date().toISOString()}] Queueing nonce hole healing`);
  return ResultAsync.fromPromise(
    eoaNonceHoleHealingQueue.add(
      `heal_${address}_${chainId}`,
      { address, chainId },
      {
        jobId: `heal_${address}_${chainId}`,
        deduplication: {
          id: `heal_${address}_${chainId}`,
          ttl: 1000 * 60 * 2, // 2 minutes
        },
      },
    ),
    (error) =>
      ({
        kind: "queue",
        code: "eoa:queuing_nonce_hole_healing_job_failed",
        source: error,
      }) as QueueingErr,
  ).mapErr((error) => {
    job.log(`[${new Date().toISOString()}] Failed to queue nonce hole healing`);
    healLogger.error("Failed to queue nonce hole healing", error);
    return error;
  });
}

export const sendWorker = new Worker<ExecutionRequest, boolean>(
  EOA_SEND_QUEUE_NAME,
  async (job) => {
    const { id, executionOptions, chainId, transactionParams } = job.data;
    sendLogger.info("Processing transaction", {
      id,
      chainId,
      address: executionOptions.accountAddress,
    });

    job.log(`[${new Date().toISOString()}] Processing transaction`);

    // Get chain and RPC client outside of ResultAsync chains
    const chain = await getChain(Number(chainId));
    const rpcRequest = getRpcClient({
      chain,
      client: thirdwebClient,
    });

    const accountResult = await getEngineAccount({
      address: executionOptions.accountAddress,
    });

    if (accountResult.isErr()) {
      // call error handler with this error
      job.log(`[${new Date().toISOString()}] Error: ${accountResult.error}`);
      // make sure this send request fails for good
      throw new UnrecoverableError("Account not found");
    }

    // Check if it's a valid EOA account
    if ("signerAccount" in accountResult.value) {
      const _error: AccountErr = {
        kind: "account",
        code: "account_not_found",
        status: 400,
        address: executionOptions.accountAddress,
        message: `Specified account ${executionOptions.accountAddress} is a smart account, invalid for EOA execution`,
      };

      // todo: call error handler with this error
      throw new UnrecoverableError("Invalid account type");
    }

    // We know this is a regular EOA account now
    const { account } = accountResult.value;
    const accountAddress = account.address as Address;

    // Prepare transaction
    const preparedTransaction = prepareTransaction({
      chain,
      client: thirdwebClient,
      data: transactionParams.data,
      to: transactionParams.to,
      value: transactionParams.value ? BigInt(transactionParams.value) : 0n,
      nonce: 0, // hardcoding nonce to skip nonce fetching
    });

    // Serialize the transaction
    const serialiseableTransactionResult = await ResultAsync.fromPromise(
      toSerializableTransaction({
        transaction: preparedTransaction,
        from: account.address,
      }),
      (error): RpcErr => ({
        kind: "rpc",
        code: "serialize_transaction_failed",
        status: 500,
        address: accountAddress,
        chainId,
        message: `Failed to serialize transaction: ${
          error instanceof Error ? error.message : String(error)
        }`,
        source: error instanceof Error ? error : undefined,
      }),
    );

    if (serialiseableTransactionResult.isErr()) {
      // call error handler with this error
      job.log(
        `[${new Date().toISOString()}] Error: ${
          serialiseableTransactionResult.error
        }`,
      );
      // let's retry this job
      throw serialiseableTransactionResult.error.source instanceof Error
        ? serialiseableTransactionResult.error.source
        : new Error(
            serialiseableTransactionResult.error.message ??
              "Failed to serialize transaction",
          );
    }

    const serialisableTransaction = serialiseableTransactionResult.value;

    job.log(
      `[${new Date().toISOString()}] Serialised transaction: ${SuperJSON.stringify(
        serialisableTransaction,
      )}`,
    );

    const precheckResult = await safeTry(async function* () {
      const issues = yield* checkEoaIssues(accountAddress, chainId);

      if (issues) {
        return errAsync({
          kind: "pre_send_check_failed",
          code: "eoa_issue",
          issues: issues,
        } as PreSendCheckFailedErr);
      }
      // Get the account - getEngineAccount already returns a Result
      // Get nonce state - getNonceState already returns a Result
      const nonceState = yield* getNonceState(accountAddress, chainId);

      // If we have too many recycled nonces, reset the state
      if (nonceState.recycledCount >= MAX_RECYCLED_COUNT) {
        // Queue a nonce reset job
        yield* queueNonceReset(accountAddress, chainId, job);
        sendLogger.warn("Too many recycled nonces, queued nonce reset", {
          id,
          chainId,
          address: accountAddress,
        });
        return errAsync({
          kind: "pre_send_check_failed",
          code: "too_many_recycled",
        } as PreSendCheckFailedErr);
      }

      // Check if we have too many in-flight transactions
      if (nonceState.inFlight >= MAX_IN_FLIGHT) {
        yield* queueNonceHoleHealing(accountAddress, chainId, job);
        return errAsync({
          kind: "pre_send_check_failed",
          code: "too_many_inflight",
        } as PreSendCheckFailedErr);
      }

      if (nonceState.recycledCount > 0) {
        const recycledNonceReusult = yield* popRecycledNonce(
          accountAddress,
          chainId,
          MAX_RECYCLED_COUNT,
        );

        if (recycledNonceReusult.status === "success") {
          return okAsync({
            nonce: recycledNonceReusult.nonce,
            epoch: recycledNonceReusult.epoch,
            type: "recycled",
          });
        }

        if (recycledNonceReusult.status === "oversized") {
          yield* queueNonceReset(accountAddress, chainId, job);
          return errAsync({
            kind: "pre_send_check_failed",
            code: "too_many_recycled",
          } as PreSendCheckFailedErr);
        }

        // only other option is empty, so we increment outside the if block anyways
      }

      const incrementedNonce = yield* incrementEngineNonce(
        accountAddress,
        chainId,
      );

      return okAsync({
        nonce: incrementedNonce,
        type: "incremented",
        epoch: nonceState.epoch,
      });
    });

    if (precheckResult.isErr()) {
      if (precheckResult.error.kind === "pre_send_check_failed") {
        // delete this job, and queue a new job at the end of the queue
        // TODO: QUEUE A NEW JOB AT THE END OF THE QUEUE
        throw new UnrecoverableError(precheckResult.error.code);
      }
      // let's retry with delay because it looks like something else went wrong
      const error =
        precheckResult.error.source instanceof Error
          ? precheckResult.error.source
          : new Error(
              precheckResult.error.code ?? "Failed to precheck transaction",
            );
      sendLogger.error("Failed to precheck transaction", precheckResult.error);
      throw error;
    }

    const nonceValues = precheckResult.value;
    const nonceToUse = precheckResult.value.nonce;

    job.log(
      `[${new Date().toISOString()}] Sending transaction with ${
        precheckResult.value.type
      } nonce ${nonceToUse}`,
    );

    const sendResult = await ResultAsync.fromPromise(
      account.sendTransaction({
        ...serialisableTransaction,
        nonce: nonceToUse,
      }),
      (error) =>
        mapTransactionSendError(error, {
          address: accountAddress,
          chainId,
          nonce: nonceToUse,
        }),
    );

    const serialisedTransaction = serializeTransaction({
      transaction: serialisableTransaction,
    });
    const computedTransactionHash = keccak256(serialisedTransaction);

    if (sendResult.isErr()) {
      const error = sendResult.error;
      if (error.kind === "transaction_send") {
        await safeTry(async function* () {
          if (error.code === "nonce_too_low") {
            let receivedReceipt: TransactionReceipt | undefined = undefined;
            try {
              receivedReceipt = await eth_getTransactionReceipt(rpcRequest, {
                hash: computedTransactionHash,
              });
            } catch (e) {
              if (e instanceof Error && e.message.includes("not found")) {
                // do nothing
              } else {
                return errAsync(
                  accountActionErrorMapper({
                    code: "get_transaction_receipt_failed",
                  }),
                );
              }
            }

            if (receivedReceipt) {
              yield* queueConfirmationJob({
                id,
                transactionHash: computedTransactionHash,
                chainId,
              });

              return okAsync({
                transactionHash: computedTransactionHash,
              });
            }

            // since nonce too low, no need to recycle nonce, but let's sync the confirmed nonce
            yield* syncConfirmedNonce(accountAddress, chain);
            return okAsync(null);
          }

          if (error.code === "already_known") {
            yield* queueConfirmationJob({
              id,
              transactionHash: computedTransactionHash,
              chainId,
            });

            return okAsync({
              transactionHash: computedTransactionHash,
            });
          }

          if (error.code === "nonce_too_high") {
            yield* queueNonceHoleHealing(accountAddress, chainId, job);
            return okAsync(null);
          }

          if (error.code === "replacement_underpriced") {
            yield* queueNonceHoleHealing(accountAddress, chainId, job);
            return okAsync(null);
          }

          if (error.code === "insufficient_funds") {
            yield* setOutOfGasIssue(
              accountAddress,
              chainId,
              serialisableTransaction.gas *
                (serialisableTransaction.gasPrice ??
                  serialisableTransaction.maxFeePerGas ??
                  0n),
            );
          }

          yield* recycleNonce(
            accountAddress,
            chainId,
            nonceToUse,
            nonceValues.epoch,
          );
          return okAsync(null);
        });
      }
    }

    const feeType =
      typeof serialisableTransaction.maxFeePerGas !== "undefined"
        ? "eip1559"
        : "legacy";

    const feeData =
      feeType === "eip1559"
        ? {
            feeType: "eip1559" as const,
            maxFeePerGas: serialisableTransaction.maxFeePerGas as bigint,
            maxPriorityFeePerGas:
              serialisableTransaction.maxPriorityFeePerGas as bigint,
          }
        : {
            feeType: "legacy" as const,
            gasPrice: serialisableTransaction.gasPrice as bigint,
          };

    await recordTransactionAttempt(id, {
      chainId,
      data: serialisableTransaction.data,
      from: accountAddress,
      hash: computedTransactionHash,
      to: serialisableTransaction.to as Address | undefined,
      gas: serialisableTransaction.gas,
      nonce: nonceToUse,
      value: serialisableTransaction.value,
      error: sendResult.isErr()
        ? sendResult.error.kind === "transaction_send"
          ? sendResult.error
          : { code: "other_engine_error", message: sendResult.error.code }
        : undefined,
      ...feeData,
    });

    if (sendResult.isOk()) {
      const transactionResponse = sendResult.value;
      const transactionHash = transactionResponse.transactionHash;

      job.log(
        `[${new Date().toISOString()}] Transaction sent successfully with hash ${transactionHash} and nonce ${nonceToUse}`,
      );

      sendLogger.info("Transaction sent successfully", {
        id,
        chainId,
        transactionHash,
        nonce: nonceToUse,
      });

      await queueConfirmationJob({
        id,
        transactionHash,
        chainId,
      });

      return true;
    }

    throw new Error("Failed to send transaction");
  },
  {
    connection: redis,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        if (attemptsMade === 1) return 2000; // First check after 2s
        if (attemptsMade <= 11) return 10000; // Every 10s for first ~2min
        if (attemptsMade <= 23) return 30000; // Every 30s until ~5min mark
        return 60000; // Every 1min thereafter
      },
    },
  },
);

function queueConfirmationJob({
  id,
  transactionHash,
  chainId,
}: {
  id: string;
  transactionHash: Hex;
  chainId: string;
}) {
  return ResultAsync.fromPromise(
    eoaConfirmQueue.add(transactionHash, {
      id,
      transactionHash,
      chainId,
    }),
    (error): QueueingErr => ({
      kind: "queue",
      code: "eoa:queuing_confirm_job_failed",
      source: error as Error,
    }),
  );
}

export const confirmWorker = new Worker<ExecutionResult, ConfirmationResult>(
  EOA_CONFIRM_QUEUE_NAME,
  async (job) => {
    const { id, transactionHash, chainId } = job.data;

    confirmLogger.info("Confirming transaction", {
      id,
      transactionHash,
      chainId,
    });
    job.log(
      `[${new Date().toISOString()}] Confirming transaction ${transactionHash}`,
    );

    // Get chain outside of ResultAsync chains
    const chain = getChain(Number(chainId));
    const rpcClient = getRpcClient({
      chain,
      client: thirdwebClient,
    });

    // Get transaction receipt
    const result = await ResultAsync.fromPromise(
      eth_getTransactionReceipt(rpcClient, { hash: transactionHash }),
      (error): RpcErr => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        confirmLogger.debug("Transaction receipt not available yet", {
          id,
          transactionHash,
          chainId,
          error: errorMessage,
          attempt: job.attemptsMade + 1,
        });

        return {
          kind: "rpc",
          code: "get_transaction_receipt_failed",
          status: 404,
          transactionHash,
          message: `Transaction receipt not found: ${errorMessage}`,
          source: error instanceof Error ? error : undefined,
        };
      },
    ).andThen((receipt) => {
      // If receipt is null, the transaction hasn't been mined yet
      if (!receipt) {
        job.log(
          `[${new Date().toISOString()}] Transaction not confirmed yet, attempt ${
            job.attemptsMade + 1
          }/60`,
        );

        return err({
          kind: "rpc",
          code: "get_transaction_receipt_failed",
          status: 404,
          transactionHash,
          message: "Transaction not mined yet",
        } as RpcErr);
      }

      // Check if the transaction was successful or reverted
      const status = receipt.status ? "success" : "reverted";

      const confirmationResult: ConfirmationResult = {
        id,
        transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        status,
      };

      job.log(
        `[${new Date().toISOString()}] Transaction confirmed with status ${status} at block ${
          receipt.blockNumber
        }`,
      );

      confirmLogger.info("Transaction confirmed", {
        id,
        transactionHash,
        status,
        blockNumber: receipt.blockNumber,
      });

      // Notify callbacks
      for (const callback of callbacks) {
        try {
          callback(confirmationResult);
        } catch (cbError) {
          confirmLogger.error("Error in confirmation callback", cbError, {
            id,
            transactionHash,
          });
        }
      }

      return ok(
        SuperJSON.serialize(confirmationResult)
          .json as unknown as ConfirmationResult,
      );
    });

    return result.match(
      // Success path
      (success) => success,
      // Error path
      (error) => {
        // Check if we've reached the maximum retry attempts
        if (job.attemptsMade >= 59) {
          confirmLogger.error(
            "Failed to confirm transaction after maximum attempts",
            {
              id,
              transactionHash,
              chainId,
              error,
            },
          );

          job.log(
            `[${new Date().toISOString()}] Failed to confirm transaction after maximum attempts`,
          );

          // Return a placeholder result with reverted status after max attempts
          return {
            id,
            transactionHash,
            blockNumber: 0n,
            gasUsed: 0n,
            effectiveGasPrice: 0n,
            status: "reverted" as const,
          };
        }

        // For all other attempts, throw the error to trigger a retry
        throw new Error(error.message || "Failed to confirm transaction");
      },
    );
  },
  {
    connection: redis,
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        if (attemptsMade === 1) return 2000; // First check after 2s
        if (attemptsMade <= 11) return 10000; // Every 10s for first ~2min
        if (attemptsMade <= 23) return 30000; // Every 30s until ~5min mark
        return 60000; // Every 1min thereafter
      },
    },
  },
);

confirmWorker.on("ready", () => {
  confirmLogger.info("worker ready");
});

confirmWorker.on("error", (err) => {
  confirmLogger.error("worker error", err);
});
