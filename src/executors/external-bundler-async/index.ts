// notes
import { DelayedError, Queue, UnrecoverableError, Worker } from "bullmq";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import {
  parseEventLogs,
  prepareEvent,
  type AbiParameterToPrimitiveType,
  type Address,
  type Hex,
} from "thirdweb";
import {
  bundleUserOp,
  createAndSignUserOp,
  getUserOpReceiptRaw,
} from "thirdweb/wallets/smart";
import { accountActionErrorMapper, type RpcErr } from "../../lib/errors";
import { getChain } from "../../lib/chain";
import { thirdwebClient } from "../../lib/thirdweb-client";
import { redis } from "../../lib/redis";
import { initializeLogger } from "../../lib/logger";

import { userOperationRevertReasonEvent } from "thirdweb/extensions/erc4337";

import { decodeErrorResult } from "viem";
import SuperJSON, { type SuperJSONResult } from "superjson";
import { getEngineAccount } from "../../lib/accounts/accounts";
import { isContractDeployed } from "thirdweb/utils";
import {
  clearAccountDeploying,
  isAccountDeploying,
  setAccountDeploying,
} from "./state";
import { env } from "../../lib/env";

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

const sendLogger = initializeLogger("executor:external-bundler-async:send");

const confirmLogger = initializeLogger(
  "executor:external-bundler-async:confirm"
);

type ExecutionRequest = {
  id: string;
  executionOptions: {
    signerAddress: Address;
    entrypointAddress: Address;
    accountFactoryAddress: Address;
    sponsorGas: boolean;
    smartAccountAddress: Address;
    accountSalt: string | undefined;
  };
  chainId: string;
  transactionParams: {
    to: Address;
    data: Hex;
    value?: bigint;
  }[];
};

export type SendResult = {
  id: string;
  chainId: string;
  userOpHash: Hex;
  accountAddress: Address;
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
  status: 500;
  message?: string;
};

export const EXTERNAL_BUNDLER_SEND_QUEUE_NAME =
  "executor_external-bundler-async_send";
export const EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME =
  "executor_external-bundler-async_confirm";

export const externalBundlerSendQueue = new Queue<ExecutionRequest>(
  EXTERNAL_BUNDLER_SEND_QUEUE_NAME,
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

await externalBundlerSendQueue.setGlobalConcurrency(
  env.SEND_TRANSACTION_QUEUE_CONCURRENCY
);

export const externalBundlerConfirmQueue = new Queue<SendResult>(
  EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME,
  {
    defaultJobOptions: {
      attempts: 100,
      backoff: {
        type: "custom",
      },
    },
    connection: redis,
  }
);

await externalBundlerConfirmQueue.setGlobalConcurrency(
  env.CONFIRM_TRANSACTION_QUEUE_CONCURRENCY
);

export function execute(request: ExecutionRequest) {
  const { executionOptions, id } = request;

  return ResultAsync.fromPromise(
    externalBundlerSendQueue.add(
      id,
      SuperJSON.serialize(request) as unknown as ExecutionRequest
    ),
    (err) =>
      ({
        kind: "queue",
        code: "external_bundler:queuing_send_job_failed",
        source: err,
        executionOptions,
      } as QueueingErr)
  );
}

export const sendWorker = new Worker<ExecutionRequest, SendResult>(
  EXTERNAL_BUNDLER_SEND_QUEUE_NAME,
  async (job): Promise<SendResult> => {
    const parsedData = SuperJSON.deserialize(
      job.data as unknown as SuperJSONResult
    ) as ExecutionRequest;
    const { executionOptions, id, chainId, transactionParams } = parsedData;

    const client = thirdwebClient;
    const chain = await getChain(Number(chainId));

    const account = await getEngineAccount({
      address: executionOptions.signerAddress,
    });

    if (account.isErr()) {
      throw new UnrecoverableError("Failed to get engine account");
    }

    if ("signerAccount" in account.value) {
      throw new UnrecoverableError(
        "Failed to get admin EOA account, received smart account"
      );
    }

    const signerAccount = account.value.account;

    // check if account is deployed
    const isDeployed = await isContractDeployed({
      address: executionOptions.smartAccountAddress,
      chain,
      client,
    });

    sendLogger.info(
      `Account ${executionOptions.smartAccountAddress} is deployed: ${isDeployed}`
    );

    if (!isDeployed) {
      // check if account is deploying
      const isDeployingResult = await isAccountDeploying(
        executionOptions.smartAccountAddress,
        chainId
      );

      if (isDeployingResult.isErr()) {
        throw new Error(
          "Unable to check if account is deploying redis error, will retry"
        );
      }

      if (isDeployingResult.value) {
        // delay so it retries
        sendLogger.info(
          `Account is deploying at ${isDeployingResult.value}, will retry`
        );
        await job.moveToDelayed(Date.now() + 5000, job.token);
        throw new DelayedError(
          `Account is deploying at ${isDeployingResult.value}, will retry`
        );
      }
    }

    const signedUserOp = await ResultAsync.fromPromise(
      createAndSignUserOp({
        adminAccount: signerAccount,
        client,
        waitForDeployment: false,
        isDeployedOverride: isDeployed,
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
    );

    if (signedUserOp.isErr()) {
      sendLogger.error(
        "Failed to sign user operation, will retry",
        signedUserOp.error,
        {
          chainId,
          id,
        }
      );
      throw new Error("Failed to sign user operation, will retry");
    }

    const userOpHash = await ResultAsync.fromPromise(
      bundleUserOp({
        userOp: signedUserOp.value,
        options: {
          chain: chain,
          client: client,
          entrypointAddress: executionOptions.entrypointAddress,
        },
      }),
      accountActionErrorMapper({
        code: "bundle_userop_failed",
      })
    );

    if (userOpHash.isErr()) {
      job.log(
        `[${new Date().toISOString()}] Failed to bundle user operation, will retry, error: ${SuperJSON.stringify(
          userOpHash.error
        )}`
      );
      sendLogger.error(
        "Failed to bundle user operation, will retry",
        userOpHash.error,
        {
          chainId,
          id,
        }
      );
      throw new Error("Failed to bundle user operation, will retry");
    }

    const confirmJobResult = await ResultAsync.fromPromise(
      externalBundlerConfirmQueue.add(
        userOpHash.value,
        {
          userOpHash: userOpHash.value,
          chainId: chain.id.toString(),
          accountAddress: executionOptions.smartAccountAddress,
          id: id,
        },
        {
          jobId: id,
        }
      ),
      (err) =>
        ({
          code: "external_bundler:queuing_confirm_job_failed",
          kind: "queue",
          executionOptions,
          source: err,
          userOpHash: userOpHash.value,
        } as QueueingErr)
    );

    if (confirmJobResult.isErr()) {
      throw new UnrecoverableError("Failed to queue confirm job");
    }

    if (!isDeployed) {
      await setAccountDeploying(
        executionOptions.smartAccountAddress,
        chainId,
        id
      );
    }

    return {
      id: id,
      accountAddress: executionOptions.smartAccountAddress,
      chainId: chain.id.toString(),
      userOpHash: userOpHash.value,
    };
  },
  {
    connection: redis,
    concurrency: env.SEND_TRANSACTION_WORKER_CONCURRENCY,
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

export function confirm(options: SendResult) {
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

export const confirmWorker = new Worker<SendResult, ConfirmationResult>(
  EXTERNAL_BUNDLER_CONFIRM_QUEUE_NAME,
  async (job): Promise<ConfirmationResult> => {
    const { userOpHash, chainId, id, accountAddress } = job.data;
    const result = await confirm({ userOpHash, chainId, id, accountAddress });

    if (result.isErr()) {
      if (isConfirmationError(result.error)) {
        const res = {
          onchainStatus: "REVERTED",
          userOpHash: job.data.userOpHash,
          id,
          ...result.error,
        } satisfies ConfirmationResult;

        await clearAccountDeploying(accountAddress, chainId);

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

    await clearAccountDeploying(accountAddress, chainId);
    return SuperJSON.serialize(res).json as unknown as ConfirmationResult;
  },
  {
    connection: redis,
    concurrency: env.CONFIRM_TRANSACTION_WORKER_CONCURRENCY,
    maxStalledCount: 10, // some tolerance for stalling, there's no penalty on the confirmation worker
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

confirmWorker.on("failed", async (job, err) => {
  confirmLogger.error("worker error", err);

  if (!job) {
    return;
  }

  const wasFinalAttempt = job.opts.attempts === job.attemptsMade;

  if (wasFinalAttempt) {
    await clearAccountDeploying(job.data.accountAddress, job.data.chainId);
  }
});
