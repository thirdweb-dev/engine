// notes
import { Queue, Worker } from "bullmq";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  parseEventLogs,
  prepareEvent,
  type AbiParameterToPrimitiveType,
  type Address,
  type Chain,
  type Hex,
  type ThirdwebClient,
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import {
  bundleUserOp,
  createAndSignUserOp,
  getUserOpReceiptRaw,
} from "thirdweb/wallets/smart";
import { accountActionErrorMapper, type RpcErr } from "../../lib/errors.js";
import { getChain } from "../../lib/chain.js";
import { thirdwebClient } from "../../lib/thirdweb-client.js";
import { redis } from "../../lib/redis.js";
import { initializeLogger } from "../../lib/logger.js";

import { userOperationRevertReasonEvent } from "thirdweb/extensions/erc4337";
import { decodeErrorResult } from "viem";
import SuperJSON from "superjson";

// todo: export these from SDK
export type PostOpRevertReasonEventFilters = Partial<{
  userOpHash: AbiParameterToPrimitiveType<{
    type: "bytes32";
    name: "userOpHash";
    indexed: true;
  }>;
  sender: AbiParameterToPrimitiveType<{
    type: "address";
    name: "sender";
    indexed: true;
  }>;
}>;

function postOpRevertReasonEvent(filters: PostOpRevertReasonEventFilters = {}) {
  return prepareEvent({
    signature:
      "event PostOpRevertReason(bytes32 indexed userOpHash, address indexed sender, uint256 nonce, bytes revertReason)",
    filters,
  });
}

const confirmLogger = initializeLogger("executor:external-bundler:confirm");

type ExecutionRequest = {
  id: string;
  executionOptions: {
    signer: Account;
    entrypointAddress: Address;
    accountFactoryAddress: Address;
    sponsorGas: boolean;
    smartAccountAddress: Address;
    accountSalt: string | undefined;
  };
  chain: Chain;
  transactionParams: {
    to: Address;
    data: Hex;
    value?: bigint;
  }[];
  client: ThirdwebClient;
};

type ExecutionResult = {
  id: string;
  userOpHash: Hex;
  chainId: string;
};

export type ConfirmationResult =
  | {
      id: string;
      userOpHash: Hex;
      transactionHash: Hex;
      actualGasCost: bigint;
      actualGasUsed: bigint;
      nonce: bigint;
      blockNumber: bigint;
    } & (
      | {
          onchainStatus: "SUCCESS";
        }
      | {
          onchainStatus: "REVERTED";
          revertData?: {
            errorName: string;
            errorArgs: Record<string, unknown>;
          };
        }
    );

const callbacks: ((result: ConfirmationResult) => void)[] = [];

export function registerCallback(
  callback: (result: ConfirmationResult) => void
) {
  confirmLogger.info(`Registered callback ${callback.name}`);
  callbacks.push(callback);
}

export type QueueingErr = {
  kind: "queue";
  code:
    | "external_bundler:queuing_confirm_job_failed"
    | "external_bundler:queuing_send_job_failed";
  executionOptions: ExecutionRequest["executionOptions"];
  userOpHash: Hex;
  source: Error;
};

export const EXTERNAL_BUNDLER_SEND_QUEUE_NAME =
  "executor_external-bundler_send";
export const EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME =
  "executor_external-bundler_confirm";

export const externalBundlerConfirmQueue = new Queue<ExecutionResult>(
  EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME,
  {
    defaultJobOptions: {
      attempts: 60,
      backoff: {
        type: "custom",
      },
    },
    connection: redis,
  }
);

export function execute(request: ExecutionRequest) {
  const { executionOptions, transactionParams, client, chain } = request;

  return ResultAsync.fromPromise(
    createAndSignUserOp({
      adminAccount: executionOptions.signer,
      client,
      waitForDeployment: false,
      smartWalletOptions: {
        // if we don't provide a factory address, SDK uses thirdweb's default account factory
        // user might be using a custom factory, and they might not provide one, so executor entrypoint should try to infer it
        factoryAddress: executionOptions.accountFactoryAddress,
        chain: chain,
        sponsorGas: executionOptions.sponsorGas,
        overrides: {
          accountSalt: executionOptions.accountSalt,
          accountAddress: executionOptions.smartAccountAddress,
          entrypointAddress: executionOptions.entrypointAddress,
        },
      },
      transactions: transactionParams.map((tx) => ({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chain: chain,
        client: client,
      })),
    }),
    accountActionErrorMapper({
      code: "sign_userop_failed",
    })
  )
    .andThen((signedUserOp) =>
      ResultAsync.fromPromise(
        bundleUserOp({
          userOp: signedUserOp,
          options: {
            chain: chain,
            client: client,
            entrypointAddress: executionOptions.entrypointAddress,
          },
        }),
        accountActionErrorMapper({
          code: "bundle_userop_failed",
        })
      )
    )
    .andThen((userOpHash) =>
      ResultAsync.fromPromise(
        externalBundlerConfirmQueue.add(
          userOpHash,
          {
            userOpHash,
            chainId: chain.id.toString(),
            id: request.id,
          },
          {
            jobId: request.id,
          }
        ),
        (err) =>
          ({
            code: "external_bundler:queuing_confirm_job_failed",
            kind: "queue",
            executionOptions,
            source: err,
            userOpHash,
          } as QueueingErr)
      )
    );
}

type ConfirmationError = {
  transactionHash: Hex;
  actualGasCost: bigint;
  actualGasUsed: bigint;
  nonce: bigint;
  blockNumber: bigint;
  revertData?: {
    errorName: string;
    errorArgs: Record<string, unknown>;
  };
};

function isConfirmationError(err: unknown): err is ConfirmationError {
  return typeof err === "object" && err !== null && "transactionHash" in err;
}

export function confirm(options: ExecutionResult) {
  return ResultAsync.fromSafePromise(getChain(Number(options.chainId)))
    .andThen((chain) =>
      ResultAsync.fromPromise(
        getUserOpReceiptRaw({
          userOpHash: options.userOpHash,
          chain,
          client: thirdwebClient,
        }),
        (e) =>
          ({
            kind: "rpc",
            code: "get_userop_receipt_failed",
            status: 500,
            message:
              e instanceof Error
                ? e.message
                : "Failed to get user operation receipt in EXTERNAL_BUNDLER:CONFIRM",
            source: e,
          } as RpcErr)
      )
    )
    .andThen((res) => {
      if (!res) {
        return okAsync(undefined);
      }

      const extractedReceipt = {
        transactionHash: res.receipt.transactionHash,
        actualGasCost: res.actualGasCost,
        actualGasUsed: res.actualGasUsed,
        nonce: res.nonce,
        blockNumber: res.receipt.blockNumber,
      };

      if (res.success === false) {
        // this was a revert, let's parse the events
        const logs = parseEventLogs({
          events: [userOperationRevertReasonEvent(), postOpRevertReasonEvent()],
          logs: res.logs,
        });

        const revertReason = logs[0]?.args.revertReason;

        const fallbackError = errAsync({
          ...extractedReceipt,
        } as ConfirmationError);

        if (!revertReason) {
          return fallbackError;
        }

        // let's try to decode the revert reason
        try {
          const { abiItem, args, errorName } = decodeErrorResult({
            data: revertReason,
          });

          if (!args || args.length === 0) {
            return fallbackError;
          }

          const namedArgs: Record<string, unknown> =
            "inputs" in abiItem && abiItem.inputs.length === args.length
              ? Object.fromEntries(
                  abiItem.inputs.map((input, i) => [input.name, args[i]])
                )
              : Object.fromEntries(args.map((arg, i) => [`arg${i}`, arg]));

          return errAsync({
            ...extractedReceipt,
            revertData: {
              errorName: errorName,
              errorArgs: namedArgs,
            },
          } as ConfirmationError);
        } catch {}

        return fallbackError;
      }
      return okAsync({
        onchainStatus: "success",
        ...extractedReceipt,
      });
    });
}

export const confirmWorker = new Worker<ExecutionResult, ConfirmationResult>(
  EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME,
  async (job): Promise<ConfirmationResult> => {
    const { userOpHash, chainId, id } = job.data;
    const result = await confirm({ userOpHash, chainId, id });

    if (result.isErr()) {
      if (isConfirmationError(result.error)) {
        const res = {
          onchainStatus: "REVERTED",
          userOpHash: job.data.userOpHash,
          id,
          ...result.error,
        } satisfies ConfirmationResult;

        for (const cb of callbacks) {
          cb(res);
        }

        return res;
      }
      // not a revert, but an unexpected RPC error
      confirmLogger.error("Failed to confirm user operation", result.error, {
        chainId,
        userOpHash,
      });

      job.log(
        `[${new Date().toISOString()}] Unexpected RPC error confirming user operation`
      );

      throw new Error("Failed to confirm user operation");
    }
    if (!result.value) {
      job.log(
        `[${new Date().toISOString()}] Did not get receipt yet. Will retry`
      );

      if (job.attemptsMade === 60) {
        job.log(
          `[${new Date().toISOString()}] Unable to confirm user operation after 60 attempts. Will not retry.`
        );

        confirmLogger.error(
          "Failed to confirm user operation after 60 attempts",
          {
            chainId,
            userOpHash,
          }
        );
      }
      throw new Error("Failed to confirm user operation");
    }

    job.log(
      `[${new Date().toISOString()}] Confirmed user operation with transaction hash ${
        result.value.transactionHash
      }`
    );

    const res = {
      ...result.value,
      onchainStatus: "SUCCESS",
      userOpHash: job.data.userOpHash,
      blockNumber: result.value.blockNumber,
      id,
    } satisfies ConfirmationResult;

    for (const cb of callbacks) {
      cb(res);
    }

    return SuperJSON.serialize(res).json as unknown as ConfirmationResult;
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
  }
);

confirmWorker.on("ready", () => {
  confirmLogger.info("worker ready");
});

confirmWorker.on("error", (err) => {
  confirmLogger.error("worker error", err);
});
