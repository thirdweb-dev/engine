import { randomUUID } from "node:crypto";
import { LRUCache } from "lru-cache";
import { errAsync, okAsync, ResultAsync, safeTry } from "neverthrow";
import SuperJSON from "superjson";
import {
  type Address,
  type Chain,
  getAddress,
  type Hex,
  type ThirdwebClient,
  ZERO_ADDRESS,
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import { db } from "../../db/connection.js";
import { transactions } from "../../db/schema.js";
import type {
  ExecutionParamsSerialized,
  TransactionParamsSerialized,
} from "../../db/types.js";
import { getEngineAccount } from "../../lib/accounts/accounts.js";
import { getChainResult } from "../../lib/chain.js";
import {
  type AccountErr,
  buildTransactionDbEntryErr,
  type EngineErr,
  mapDbError,
  type ValidationErr,
} from "../../lib/errors.js";
import {
  type ExecutionRequest as AsyncBundlerExecutionRequest,
  execute as executeExternalBundlerAsync,
} from "../external-bundler-async/index.js";
import type { EncodedExecutionRequest } from "../types.js";
import "./external-bundler-confirm-handler.js";
import "./external-bundler-send-handler.js";
import { resolve as resolve_aa } from "../../executors/execute/resolution/aa.js";

import { isZkSyncChainResult } from "../../lib/result-wrapped/thirdweb-sdk.js";
import {
  type CreateRestrictedSignedTokenResult,
  createRestrictedSignedToken,
  isStoredToken,
} from "./vault-helper.js";

type AsyncBundlerExecutionRequestOptions =
  AsyncBundlerExecutionRequest["executionOptions"];

// Define what we cache - the address info needed to create accounts
type CachedExecutionAccountInfo =
  | {
      type: "EOA";
      address: Address;
    }
  | {
      type: "ERC4337";
      signerAddress: Address;
      smartAccountAddress: Address;
      factoryAddress: Address;
      entrypointAddress: Address;
      accountSalt: string | null;
    }
  | {
      type: "zksync";
      accountAddress: Address;
    };

// Create an LRU cache for the account resolution info
export const executionAccountCache = new LRUCache<
  string,
  CachedExecutionAccountInfo
>({
  max: 10_000, // Store up to 10_000 resolution results
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 day cache expiration
});

// Generate a comprehensive cache key that encodes all request parameters
function generateExecutionAccountCacheKey(
  request: EncodedExecutionRequest,
): string {
  switch (request.executionOptions.type) {
    case "auto":
      return `auto_${request.executionOptions.from}:${request.executionOptions.chainId}`;
    case "ERC4337": {
      const options = request.executionOptions;
      return [
        `type:${options.type}`,
        `signer:${options.signerAddress}`,
        `smartAddr:${"smartAccountAddress" in options ? options.smartAccountAddress : "unspecified"}`,
        `entrypoint:${options.entrypointAddress ?? "unspecified"}`,
        `factory:${options.factoryAddress ?? "unspecified"}`,
        `salt:${"accountSalt" in options ? options.accountSalt : "unspecified"}`,
        `chain:${options.chainId}`,
      ].join("_");
    }
    case "zksync": {
      return `AA:zksync_${request.executionOptions.accountAddress}:${request.executionOptions.chainId}`;
    }
  }
}

export type ExecutionCredentials = {
  vaultAccessToken?: string;

  // thirdweb credentials
  thirdwebSecretKey?: string;
  thirdwebClientId?: string;
  thirdwebServiceKey?: string;
};

type ResolvedExecutionAccount_AA = {
  type: "ERC4337";
  signerAccount: Account;
  smartAccountDetails: {
    factoryAddress: Address;
    entrypointAddress: Address;
    address: Address;
  } & { accountSalt: string | null | undefined };
};

type ResolvedExecutionAccount_zksync = {
  type: "zksync";
  zkEoaAccount: Account;
};

type ResolvedExecutionAccount_EOA = {
  type: "EOA";
  account: Account;
};

type ResolvedExecutionAccount =
  | ResolvedExecutionAccount_AA
  | ResolvedExecutionAccount_zksync
  | ResolvedExecutionAccount_EOA;

/**
 * Resolves the appropriate accounts needed for transaction execution from the provided request.
 * This function handles multiple scenarios including vault authentication, smart account resolution,
 * and account prediction with various degrees of provided information.
 *
 * @param request - The encoded execution request containing authentication and account details
 * @param credentials - Credentials for authentication, including optional vault access token
 *
 * @returns A ResultAsync that resolves to either:
 *   - `{ signerAccount, smartAccountDetails }` for smart account transactions
 *     - `signerAccount`: The EOA account that will sign transactions
 *     - `smartAccountDetails`: Contains address, factory, entrypoint and optional salt
 *   - `{ account }` for direct EOA transactions
 *   - `{ zkEoaAccount }` for zkSync account transactions
 *
 * The function returns errors (not throws) in these cases:
 * - AccountErr: When provided signerAddress is a smart account (not allowed as signer)
 * - AccountErr: When a smart account address is an EOA (not allowed as smart account)
 * - ValidationErr: When using zkSync execution on a non-zkSync chain
 */
export function getExecutionAccountFromRequest({
  client,
  credentials,
  request,
}: {
  request: EncodedExecutionRequest;
  credentials: ExecutionCredentials;
  client: ThirdwebClient;
}): ResultAsync<ResolvedExecutionAccount, EngineErr> {
  return safeTry(async function* () {
    const cacheKey = generateExecutionAccountCacheKey(request);
    const cachedInfo = executionAccountCache.get(cacheKey);

    // console.timeLog("execute", "cache fetched");

    if (cachedInfo) {
      // console.log("DEBUG CACHED", cachedInfo);
      // console.timeLog("execute", "cache hit");

      // Reconstruct the account objects from cached info
      switch (cachedInfo.type) {
        case "EOA": {
          // Get the EOA account (light operation since we know it exists)
          const engineAccountResult = yield* getEngineAccount({
            address: cachedInfo.address,
            vaultAccessToken: credentials.vaultAccessToken,
          });

          if ("signerAccount" in engineAccountResult) {
            return errAsync({
              kind: "account",
              code: "account_not_found",
              message: `Account not found: ${cachedInfo.address}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
              status: 400,
            } as AccountErr);
          }

          return okAsync({
            type: "EOA",
            account: engineAccountResult.account,
          } as ResolvedExecutionAccount);
        }

        case "zksync": {
          const engineAccountResult = yield* getEngineAccount({
            address: cachedInfo.accountAddress,
            vaultAccessToken: credentials.vaultAccessToken,
          });

          if ("signerAccount" in engineAccountResult) {
            // This should never happen with cached valid data
            return errAsync({
              kind: "account",
              code: "account_not_found",
              message: `Account not found: ${cachedInfo.accountAddress}. Provided account address is an ERC4337 smart account. ERC4337 Smart Account cannot be used for zksync AA`,
              status: 400,
            } as AccountErr);
          }

          return okAsync({
            type: "zksync",
            zkEoaAccount: engineAccountResult.account,
          } as ResolvedExecutionAccount);
        }

        case "ERC4337": {
          // For smart account, get the signer EOA
          const signerAccount = yield* getEngineAccount({
            address: cachedInfo.signerAddress,
            vaultAccessToken: credentials.vaultAccessToken,
          });

          if ("signerAccount" in signerAccount) {
            // This should never happen with cached valid data
            return errAsync({
              kind: "account",
              code: "account_not_found",
              message: `Invalid cached data: ${cachedInfo.signerAddress}. Signer address is a smart account.`,
              status: 400,
            } as AccountErr);
          }

          // Return the reconstructed result
          return okAsync({
            type: "ERC4337",
            signerAccount: signerAccount.account,
            smartAccountDetails: {
              address: cachedInfo.smartAccountAddress,
              factoryAddress: cachedInfo.factoryAddress,
              entrypointAddress: cachedInfo.entrypointAddress,
              accountSalt: cachedInfo.accountSalt,
            },
          } as ResolvedExecutionAccount);
        }
      }
    }

    // console.timeLog("execute", "cache miss, before full resolution");

    // Not in cache, run the full resolution logic
    const result = yield* getExecutionAccountFromRequest_uncached({
      request,
      credentials,
      client,
    });

    // console.timeLog("execute", "cache miss, after full resolution");

    // console.log("DEBUG CACHE MISS", result);

    // Cache the resolution info for future use
    switch (result.type) {
      case "EOA": {
        executionAccountCache.set(cacheKey, {
          type: "EOA",
          address: result.account.address as Address,
        });
        break;
      }
      case "zksync": {
        executionAccountCache.set(cacheKey, {
          type: "zksync",
          accountAddress: result.zkEoaAccount.address as Address,
        });
        break;
      }
      case "ERC4337": {
        executionAccountCache.set(cacheKey, {
          type: "ERC4337",
          signerAddress: result.signerAccount.address as Address,
          smartAccountAddress: result.smartAccountDetails.address,
          factoryAddress: result.smartAccountDetails.factoryAddress,
          entrypointAddress: result.smartAccountDetails.entrypointAddress,
          accountSalt: result.smartAccountDetails.accountSalt ?? null,
        });
        break;
      }
    }

    return okAsync(result);
  });
}

function getExecutionAccountFromRequest_uncached({
  request,
  credentials,
  client,
}: {
  request: EncodedExecutionRequest;
  credentials: ExecutionCredentials;
  client: ThirdwebClient;
}): ResultAsync<ResolvedExecutionAccount, EngineErr> {
  return safeTry(async function* () {
    const chain = yield* getChainResult(request.executionOptions.chainId);
    // in case of a vault access token credential, skip storage lookup because these accounts are never stored in the DB
    const shouldSkipStorageLookup = !!credentials.vaultAccessToken;

    switch (request.executionOptions.type) {
      case "auto": {
        {
          const engineAccountResponse = yield* getEngineAccount({
            address: request.executionOptions.from,
            vaultAccessToken: credentials.vaultAccessToken,
          });

          if ("signerAccount" in engineAccountResponse) {
            return okAsync({
              type: "ERC4337" as const,
              signerAccount: engineAccountResponse.signerAccount,
              smartAccountDetails: engineAccountResponse.smartAccountDetails,
            });
          }

          const isZkChain = yield* isZkSyncChainResult(chain);

          if (isZkChain) {
            return okAsync({
              type: "zksync" as const,
              zkEoaAccount: engineAccountResponse.account,
            });
          }

          const aaResolution = yield* resolve_aa({
            options: {
              chainId: request.executionOptions.chainId,
              signerAddress: engineAccountResponse.account.address as Address,
              type: "ERC4337",
              sponsorGas: true,
            },
            chain,
            credentials,
            client,
            skipStorageLookup: shouldSkipStorageLookup,
          });

          return okAsync({
            type: "ERC4337" as const,
            signerAccount: engineAccountResponse.account,
            smartAccountDetails: aaResolution.smartAccountDetails,
          } as ResolvedExecutionAccount);

          // return okAsync({
          //   type: "EOA" as const,
          //   account: engineAccountResponse.account,
          // });
        }
      }
      case "ERC4337": {
        {
          const resolved = yield* resolve_aa({
            options: request.executionOptions,
            chain,
            credentials,
            client,
            skipStorageLookup: shouldSkipStorageLookup,
          });

          return okAsync({
            type: "ERC4337" as const,
            ...resolved,
          });
        }
      }
      case "zksync": {
        const isThisZkSyncChain = yield* isZkSyncChainResult(chain);
        if (!isThisZkSyncChain) {
          return errAsync({
            kind: "validation",
            code: "invalid_chain",
            message: `Invalid chain ID: ${request.executionOptions.chainId}. AA:zksync execution is only supported on zkSync chains.`,
            status: 400,
          } satisfies ValidationErr as ValidationErr);
        }
        const engineAccountResponse = yield* getEngineAccount({
          address: request.executionOptions.accountAddress,
          vaultAccessToken: credentials.vaultAccessToken,
        });

        // we expected to receive an eoa account but got a signer, which is invalid
        if ("signerAccount" in engineAccountResponse) {
          return errAsync({
            kind: "account",
            code: "account_not_found",
            message:
              "Provided account address is an ERC4337 smart account. ERC4337 Smart Account cannot be used for zksync AA",
            status: 400,
          } as AccountErr);
        }

        return okAsync({
          type: "zksync" as const,
          zkEoaAccount: engineAccountResponse.account,
        });
      }
    }
  });
}

export function execute({
  request,
  credentials,
  client,
}: {
  request: EncodedExecutionRequest;
  credentials: ExecutionCredentials;
  client: ThirdwebClient;
}) {
  return safeTry(async function* () {
    // console.time("execute");
    const resolutionResponse = yield* getExecutionAccountFromRequest({
      client,
      credentials,
      request,
    });

    const chain = yield* getChainResult(request.executionOptions.chainId);

    // console.timeLog("execute", "getExecutionAccountFromRequest");

    switch (resolutionResponse.type) {
      case "EOA": {
        return errAsync({
          kind: "account",
          code: "account_not_found",
          message: "EOA execution is not supported yet",
          status: 500,
        } as EngineErr);
      }
      case "ERC4337": {
        return okAsync(
          yield* executeAA({
            chain,
            client,
            credentials,
            options: resolutionResponse,
            request,
          }),
        );
      }
      case "zksync": {
        return errAsync({
          kind: "account",
          code: "account_not_found",
          message: "zksync AA execution is not supported yet",
          status: 500,
        } as EngineErr);
      }
    }
  });
}

function executeAA({
  chain,
  client,
  credentials,
  options,
  request,
}: {
  options: ResolvedExecutionAccount_AA;
  request: EncodedExecutionRequest;
  credentials: ExecutionCredentials;
  chain: Chain;
  client: ThirdwebClient;
}) {
  return safeTry(async function* () {
    const executionOptions = {
      signer: options.signerAccount,
      accountSalt:
        "accountSalt" in options.smartAccountDetails
          ? (options.smartAccountDetails.accountSalt ?? undefined)
          : undefined,
      accountFactoryAddress: options.smartAccountDetails.factoryAddress,
      entrypointAddress: options.smartAccountDetails.entrypointAddress,
      smartAccountAddress: options.smartAccountDetails.address,
      sponsorGas:
        "sponsorGas" in request.executionOptions
          ? request.executionOptions.sponsorGas
          : true,
    };

    const resolvedTransactionParams = request.params.map((tx) => ({
      value: tx.value ?? 0n,
      data: tx.data ?? ("0x" as Hex),
      to: tx.to ?? (ZERO_ADDRESS as Address),
    }));

    const idempotencyKey =
      request.executionOptions.idempotencyKey ?? randomUUID().toString();

    let restrictedTokenInfo: CreateRestrictedSignedTokenResult | null = null;

    if (
      credentials.vaultAccessToken &&
      isStoredToken(credentials.vaultAccessToken)
    ) {
      // Convert stored token to restricted signed token with specific permissions
      const restrictedTokenResult = yield* createRestrictedSignedToken({
        storedToken: credentials.vaultAccessToken,
        chainId: request.executionOptions.chainId,
        chain, // Pass the chain object directly
        thirdwebClient: client,
        entrypointAddress: executionOptions.entrypointAddress,
        smartAccountAddress: executionOptions.smartAccountAddress,
        transactionParams: resolvedTransactionParams,
      });

      // console.timeLog("execute", "after signed token");

      restrictedTokenInfo = restrictedTokenResult;
    }

    // Execute using the appropriate executor
    // For async executor, we need to convert the execution options to the format it expects
    const asyncExecutionOptions: AsyncBundlerExecutionRequestOptions = {
      signerAddress: executionOptions.signer.address as Address,
      entrypointAddress: executionOptions.entrypointAddress,
      accountFactoryAddress: executionOptions.accountFactoryAddress,
      sponsorGas: executionOptions.sponsorGas,
      smartAccountAddress: executionOptions.smartAccountAddress,
      accountSalt: executionOptions.accountSalt,

      thirdwebClientId: credentials.thirdwebClientId,
      thirdwebServiceKey: credentials.thirdwebServiceKey,
    };

    // Add vault token and nonce data if available (from restricted token)
    if (restrictedTokenInfo) {
      asyncExecutionOptions.vaultAccessToken = restrictedTokenInfo.signedToken;
      asyncExecutionOptions.preallocatedNonce =
        restrictedTokenInfo.preallocatedNonce;
      asyncExecutionOptions.nonceSeed = restrictedTokenInfo.nonceSeed;
    }

    // console.timeLog("execute", "before calling async executor");

    // Execute using the async executor
    const asyncResult = await executeExternalBundlerAsync({
      id: idempotencyKey,
      executionOptions: asyncExecutionOptions,
      chainId: request.executionOptions.chainId,
      transactionParams: resolvedTransactionParams,
    });

    // console.timeLog("execute", "after calling async executor");

    // Handle errors from the async executor
    if (asyncResult.isErr()) {
      return errAsync(asyncResult.error);
    }

    const executionParams: ExecutionParamsSerialized = {
      type: "AA" as const,
      entrypointAddress: options.smartAccountDetails.entrypointAddress,
      smartAccountAddress: options.smartAccountDetails.address,
      signerAddress: getAddress(options.signerAccount.address),
    };

    const dbTransactionEntry = yield* ResultAsync.fromPromise(
      db
        .insert(transactions)
        .values({
          id: idempotencyKey,
          batchIndex: 0,
          chainId: request.executionOptions.chainId,
          transactionParams: SuperJSON.serialize(resolvedTransactionParams)
            .json as TransactionParamsSerialized[],
          executionParams,
          clientId: credentials.thirdwebClientId,
          executionResult: {
            status: "QUEUED",
          },
          from: executionParams.smartAccountAddress as Address,
        })
        .returning(),
      mapDbError,
    ).mapErr((e) =>
      buildTransactionDbEntryErr({
        error: e,
        executionParams,
        executionResult: {
          status: "QUEUED",
        },
      }),
    );
    // console.timeEnd("execute");

    return okAsync({
      executionResult: {
        status: "QUEUED",
      },
      transactions: dbTransactionEntry,
      executionOptions: options,
    });
  });
}
