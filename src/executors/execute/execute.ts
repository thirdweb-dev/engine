import { errAsync, okAsync, ResultAsync, safeTry } from "neverthrow";
import { getEngineAccount } from "../../lib/accounts/accounts.js";
import type { EncodedExecutionRequest } from "../types.js";
import { LRUCache } from "lru-cache";

import {
  buildTransactionDbEntryErr,
  mapDbError,
  type AccountErr,
  type EngineErr,
} from "../../lib/errors.js";
import { execute as executeExternalBundler } from "../external-bundler/index.js";
import {
  execute as executeExternalBundlerAsync,
  type ExecutionRequest as AsyncBundlerExecutionRequest,
} from "../external-bundler-async/index.js";

import { getChain } from "../../lib/chain.js";
import {
  getContract,
  isHex,
  stringToHex,
  ZERO_ADDRESS,
  type Address,
  type Hex,
  type ThirdwebClient,
} from "thirdweb";
import type { Account } from "thirdweb/wallets";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_6,
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_6,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import { predictAccountAddress } from "thirdweb/extensions/erc4337";
import { thirdwebClient } from "../../lib/thirdweb-client.js";
import { db } from "../../db/connection.js";
import { transactions } from "../../db/schema.js";
import { randomUUID } from "node:crypto";
import SuperJSON from "superjson";
import type {
  ExecutionParamsSerialized,
  TransactionParamsSerialized,
  ExecutionResult4337Serialized,
} from "../../db/types.js";
import "./external-bundler-confirm-handler.js";
import "./external-bundler-send-handler.js";
import { getVaultAccount } from "../../lib/accounts/vault/get-vault-account.js";
import { vaultClient } from "../../lib/vault-client.js";
import {
  createRestrictedSignedToken,
  isSignedToken,
  isStoredToken,
  type CreateRestrictedSignedTokenResult,
} from "./vault-helper.js";

type AsyncBundlerExecutionRequestOptions =
  AsyncBundlerExecutionRequest["executionOptions"];

// Define what we cache - the address info needed to create accounts
type CachedExecutionAccountInfo =
  | {
      type: "eoa";
      address: Address;
    }
  | {
      type: "aa";
      signerAddress: Address;
      smartAccountAddress: Address;
      factoryAddress: Address;
      entrypointAddress: Address;
      accountSalt: string | null;
    };

// Create an LRU cache for the account resolution info
export const executionAccountCache = new LRUCache<
  string,
  CachedExecutionAccountInfo
>({
  max: 2048, // Store up to 2048 resolution results
  ttl: 1000 * 60 * 60 * 24 * 7, // 7 day cache expiration
});

// Generate a comprehensive cache key that encodes all request parameters
function generateExecutionAccountCacheKey(
  request: EncodedExecutionRequest,
): string {
  // For direct EOA requests
  if ("from" in request) {
    return `vague_${request.from}:${request.chainId}`;
  }

  // For smart account requests - include all possible parameters
  const options = request.executionOptions;
  return [
    `specific`,
    `type:${options.type}`,
    `signer:${options.signerAddress}`,
    `smartAddr:${"smartAccountAddress" in options ? options.smartAccountAddress : "unspecified"}`,
    `entrypoint:${options.entrypointAddress ?? "unspecified"}`,
    `factory:${options.factoryAddress ?? "unspecified"}`,
    `salt:${"accountSalt" in options ? options.accountSalt : "unspecified"}`,
    `chain:${request.chainId}`,
  ].join("_");
}

/**
 * Resolves the appropriate accounts needed for transaction execution from the provided request.
 * This function handles multiple scenarios including vault authentication, smart account resolution,
 * and account prediction with various degrees of provided information.
 *
 * @param request - The encoded execution request containing authentication and account details
 *
 * @returns A ResultAsync that resolves to either:
 *   - `{ signerAccount, smartAccountDetails }` for smart account transactions
 *     - `signerAccount`: The EOA account that will sign transactions
 *     - `smartAccountDetails`: Contains address, factory, entrypoint and optional salt
 *   - `{ account }` for direct EOA transactions
 *
 * The function returns errors (not throws) in these cases:
 * - AccountErr: When provided signerAddress is a smart account (not allowed as signer)
 * - AccountErr: When a smart account address is an EOA (not allowed as smart account)
 *
 * The function handles different scenarios:
 * - Vault authentication (using vault access tokens)
 * - User-provided smart account details (complete or partial)
 * - Smart account lookup from database
 * - Smart account address prediction when not explicitly provided
 * - Default factory/entrypoint resolution when not specified
 */
export function getExecutionAccountFromRequest(
  request: EncodedExecutionRequest,
): ResultAsync<
  | {
      signerAccount: Account;
      smartAccountDetails: {
        factoryAddress: Address;
        entrypointAddress: Address;
        address: Address;
        accountSalt: string | null | undefined;
      };
    }
  | { account: Account },
  EngineErr
> {
  return safeTry(async function* () {
    const cacheKey = generateExecutionAccountCacheKey(request);
    const cachedInfo = executionAccountCache.get(cacheKey);

    // console.timeLog("execute", "cache fetched");

    if (cachedInfo) {
      // console.log("DEBUG CACHED", cachedInfo);
      // console.timeLog("execute", "cache hit");

      // Reconstruct the account objects from cached info
      if (cachedInfo.type === "eoa") {
        // Get the EOA account (light operation since we know it exists)
        const engineAccountResult = yield* getEngineAccount({
          address: cachedInfo.address,
          vaultAccessToken: request.vaultAccessToken,
        });

        if ("signerAccount" in engineAccountResult) {
          return errAsync({
            kind: "account",
            code: "account_not_found",
            message: `Account not found: ${cachedInfo.address}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
            status: 400,
          } as AccountErr);
        }

        return okAsync({ account: engineAccountResult.account });
      } else {
        // For smart account, get the signer EOA
        const signerAccount = yield* getEngineAccount({
          address: cachedInfo.signerAddress,
          vaultAccessToken: request.vaultAccessToken,
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
          signerAccount: signerAccount.account,
          smartAccountDetails: {
            address: cachedInfo.smartAccountAddress,
            factoryAddress: cachedInfo.factoryAddress,
            entrypointAddress: cachedInfo.entrypointAddress,
            accountSalt: cachedInfo.accountSalt,
          },
        });
      }
    }

    // console.timeLog("execute", "cache miss, before full resolution");

    // Not in cache, run the full resolution logic
    const result = yield* getExecutionAccountFromRequestImpl(request);

    // console.timeLog("execute", "cache miss, after full resolution");

    // console.log("DEBUG CACHE MISS", result);

    // Cache the resolution info for future use
    if ("account" in result) {
      executionAccountCache.set(cacheKey, {
        type: "eoa",
        address: result.account.address as Address,
      });
    } else {
      executionAccountCache.set(cacheKey, {
        type: "aa",
        signerAddress: result.signerAccount.address as Address,
        smartAccountAddress: result.smartAccountDetails.address,
        factoryAddress: result.smartAccountDetails.factoryAddress,
        entrypointAddress: result.smartAccountDetails.entrypointAddress,
        accountSalt: result.smartAccountDetails.accountSalt ?? null,
      });
    }

    return okAsync(result);
  });
}

function getExecutionAccountFromRequestImpl(
  request: EncodedExecutionRequest,
): ResultAsync<
  | {
      signerAccount: Account;
      smartAccountDetails: {
        factoryAddress: Address;
        entrypointAddress: Address;
        address: Address;
      } & { accountSalt: string | null | undefined };
    }
  | { account: Account },
  EngineErr
> {
  return safeTry(async function* () {
    if (request.vaultAccessToken) {
      if ("from" in request) {
        // this will break because we don't have EOA execution right now
        return okAsync({
          account: getVaultAccount({
            address: request.from,
            auth: {
              accessToken: request.vaultAccessToken,
            },
            thirdwebClient,
            vaultClient,
          }),
        });
      }

      const smartAccountAddress =
        "smartAccountAddress" in request.executionOptions
          ? request.executionOptions.smartAccountAddress
          : undefined;

      const factoryAddress =
        request.executionOptions.factoryAddress ?? DEFAULT_ACCOUNT_FACTORY_V0_7;

      const entrypointAddress =
        (request.executionOptions.entrypointAddress ??
        factoryAddress === DEFAULT_ACCOUNT_FACTORY_V0_6)
          ? (ENTRYPOINT_ADDRESS_v0_6 as Address)
          : (ENTRYPOINT_ADDRESS_v0_7 as Address);

      const salt =
        "accountSalt" in request.executionOptions
          ? request.executionOptions.accountSalt
          : undefined;

      const chain = getChain(Number.parseInt(request.chainId));

      const factoryContract = getContract({
        address: factoryAddress,
        chain,
        client: thirdwebClient,
      });

      const saltHex = salt && isHex(salt) ? salt : stringToHex(salt ?? "");

      // console.time("predict smart account address");
      const finalSmartAccountAddress =
        smartAccountAddress ??
        ((await predictAccountAddress({
          adminSigner: request.executionOptions.signerAddress,
          contract: factoryContract,
          data: saltHex,
        })) as Address);

      // console.timeEnd("predict smart account address");

      return okAsync({
        signerAccount: getVaultAccount({
          address: request.executionOptions.signerAddress,
          auth: {
            accessToken: request.vaultAccessToken,
          },
          thirdwebClient,
          vaultClient,
        }),
        smartAccountDetails: {
          address: finalSmartAccountAddress,
          factoryAddress,
          entrypointAddress,
          accountSalt: salt,
        },
      });
    }

    // if only from is provided, we use it to fetch an account
    // we either get only account, or a signer + smartAccount
    if ("from" in request) {
      return okAsync(
        yield* getEngineAccount({
          address: request.from,
          vaultAccessToken: request.vaultAccessToken,
        }),
      );
    }

    // if from was not provided, then we know signerAddress was provided
    // but a smartAccountAddress may or may not be provided
    // if smart account address was provided, there are two cases:
    //
    // 1. Smart Account is registered to this EOA in the DB.
    //    In which case we can fetch all data about the smart account
    //
    // 2. Smart Account is not registered to this EOA in the DB.
    //    In which case we need to rely on executionOptions to contain all data,
    //    and if not we defer to default values

    if ("smartAccountAddress" in request.executionOptions) {
      // the simplest case is if the request contains all the data we need: entrypointAddress, factoryAddress
      if (
        request.executionOptions.entrypointAddress &&
        request.executionOptions.factoryAddress
      ) {
        // good to go! let's just fetch the EOA and send provided execution options
        const engineSignerAccountResponse = yield* getEngineAccount({
          address: request.executionOptions.signerAddress,
        });

        // we expected to receive an eoa account but got a signer, which is invalid
        if ("signerAccount" in engineSignerAccountResponse) {
          return errAsync({
            kind: "account",
            code: "account_not_found",
            message: `Account not found: ${request.executionOptions.signerAddress}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
            status: 400,
          } as AccountErr);
        }

        return okAsync({
          signerAccount: engineSignerAccountResponse.account,
          smartAccountDetails: {
            address: request.executionOptions.smartAccountAddress,
            factoryAddress: request.executionOptions.factoryAddress,
            entrypointAddress: request.executionOptions.entrypointAddress,
            accountSalt: undefined,
          },
        });
      }

      // if request doesn't contain everything, let's look at DB to find a smart account registered to this EOA
      const smartAccountResult = await getEngineAccount({
        address: request.executionOptions.smartAccountAddress,
        signerAddress: request.executionOptions.signerAddress,
      });

      if (smartAccountResult.isErr()) {
        // it's okay if the account was not found, but return any other received errors
        if (smartAccountResult.error.code !== "account_not_found") {
          return errAsync(smartAccountResult.error);
        }

        // we tried to look in db but did not find a smart account registered to this EOA, let's use default values
        const engineSignerAccountResponse = yield* getEngineAccount({
          address: request.executionOptions.signerAddress,
        });

        // we expected to receive an eoa account but got a signer, which is invalid
        if ("signerAccount" in engineSignerAccountResponse) {
          return errAsync({
            kind: "account",
            code: "account_not_found",
            message: `Account not found: ${request.executionOptions.signerAddress}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
            status: 400,
          } as AccountErr);
        }

        // we found the signer eoa, let's use default values for the smart account
        return okAsync({
          signerAccount: engineSignerAccountResponse.account,
          smartAccountDetails: {
            address: request.executionOptions.smartAccountAddress,
            factoryAddress: DEFAULT_ACCOUNT_FACTORY_V0_7 as Address,
            entrypointAddress: ENTRYPOINT_ADDRESS_v0_7 as Address,
            accountSalt: undefined,
          },
        });
      }

      // let's make sure that we received a smart account and not and EOA
      if ("account" in smartAccountResult.value) {
        return errAsync({
          kind: "account",
          code: "account_not_found",
          message: `Account not found: ${request.executionOptions.smartAccountAddress}. Provided smart account address is an EOA. EOA must not be used as a smart account.`,
          status: 400,
        } as AccountErr);
      }
      // we found the smart account, let's use it
      return okAsync({
        signerAccount: smartAccountResult.value.signerAccount,
        smartAccountDetails: {
          address: smartAccountResult.value.smartAccountDetails.address,
          factoryAddress:
            smartAccountResult.value.smartAccountDetails.factoryAddress,
          entrypointAddress:
            smartAccountResult.value.smartAccountDetails.entrypointAddress,
          accountSalt:
            smartAccountResult.value.smartAccountDetails.accountSalt ??
            undefined,
        },
      });
    }

    // smart account address was not provided, but we have the signer eoa
    // user has selected AA execution, so we use the provided factory and salt values, or assume defaults to get the execution options

    // fetch the EOA

    const signerAccountResponse = yield* getEngineAccount({
      address: request.executionOptions.signerAddress,
    });

    // make sure we got an EOA
    if ("signerAccount" in signerAccountResponse) {
      return errAsync({
        kind: "account",
        code: "account_not_found",
        message: `Account not found: ${request.executionOptions.signerAddress}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
        status: 400,
      } as AccountErr);
    }

    const factoryAddress =
      request.executionOptions.factoryAddress ??
      (DEFAULT_ACCOUNT_FACTORY_V0_7 as Address);

    const accountSalt = request.executionOptions.accountSalt;

    const chain = getChain(Number.parseInt(request.chainId));

    const factoryContract = getContract({
      address: factoryAddress,
      chain,
      client: thirdwebClient,
    });

    const saltHex =
      accountSalt && isHex(accountSalt)
        ? accountSalt
        : stringToHex(accountSalt ?? "");

    const predictedSmartAccountAddress = await predictAccountAddress({
      adminSigner: signerAccountResponse.account.address,
      contract: factoryContract,
      data: saltHex,
    });

    return okAsync({
      signerAccount: signerAccountResponse.account,
      smartAccountDetails: {
        address: predictedSmartAccountAddress as Address,
        factoryAddress,
        entrypointAddress:
          request.executionOptions.entrypointAddress ??
          (ENTRYPOINT_ADDRESS_v0_7 as Address),
        accountSalt: request.executionOptions.accountSalt,
      },
    });
  });
}

export function execute({
  request,
  client,
}: {
  request: EncodedExecutionRequest;
  client: ThirdwebClient;
}) {
  const chain = getChain(Number.parseInt(request.chainId));

  return safeTry(async function* () {
    // console.time("execute");
    const engineAccountResponse =
      yield* getExecutionAccountFromRequest(request);

    // console.timeLog("execute", "getExecutionAccountFromRequest");

    if ("account" in engineAccountResponse) {
      return errAsync({
        kind: "account",
        code: "account_not_found",
        message: "EOA execution is not supported yet",
        status: 500,
      } as EngineErr);
    }

    const executionOptions = {
      signer: engineAccountResponse.signerAccount,
      accountSalt:
        "accountSalt" in engineAccountResponse.smartAccountDetails
          ? (engineAccountResponse.smartAccountDetails.accountSalt ?? undefined)
          : undefined,
      accountFactoryAddress:
        engineAccountResponse.smartAccountDetails.factoryAddress,
      entrypointAddress:
        engineAccountResponse.smartAccountDetails.entrypointAddress,
      smartAccountAddress: engineAccountResponse.smartAccountDetails.address,
      sponsorGas:
        "executionOptions" in request
          ? request.executionOptions.sponsorGas
          : true,
    };

    const resolvedTransactionParams = request.transactionParams.map((tx) => ({
      value: tx.value ?? 0n,
      data: tx.data ?? ("0x" as Hex),
      to: tx.to ?? (ZERO_ADDRESS as Address),
    }));

    const idempotencyKey = request.idempotencyKey ?? randomUUID().toString();

    // Determine which executor to use based on request parameters
    // Determine which executor to use based on token type
    let executorType: "async" | "sync";
    let restrictedTokenInfo: CreateRestrictedSignedTokenResult | null = null;

    if (!request.vaultAccessToken) {
      executorType = "async";
    } else if (isSignedToken(request.vaultAccessToken)) {
      // Already restricted tokens can use sync
      executorType = "sync";
    } else if (isStoredToken(request.vaultAccessToken)) {
      // Stored tokens need conversion to secure signed tokens
      executorType = "async";

      // console.timeLog("execute", "before signed token");

      // Convert stored token to restricted signed token with specific permissions
      const restrictedTokenResult = yield* createRestrictedSignedToken({
        storedToken: request.vaultAccessToken,
        chainId: request.chainId,
        chain, // Pass the chain object directly
        thirdwebClient: client,
        entrypointAddress: executionOptions.entrypointAddress,
        smartAccountAddress: executionOptions.smartAccountAddress,
        transactionParams: resolvedTransactionParams,
      });

      // console.timeLog("execute", "after signed token");

      restrictedTokenInfo = restrictedTokenResult;
    } else {
      // Unknown token type - default to sync for safety
      executorType = "sync";
    }

    // Variables to track execution state
    let executionResult: ExecutionResult4337Serialized;
    let userOpHash: string | undefined;

    // Execute using the appropriate executor
    if (executorType === "async") {
      // For async executor, we need to convert the execution options to the format it expects
      const asyncExecutionOptions: AsyncBundlerExecutionRequestOptions = {
        signerAddress: executionOptions.signer.address as Address,
        entrypointAddress: executionOptions.entrypointAddress,
        accountFactoryAddress: executionOptions.accountFactoryAddress,
        sponsorGas: executionOptions.sponsorGas,
        smartAccountAddress: executionOptions.smartAccountAddress,
        accountSalt: executionOptions.accountSalt,
      };

      // Add vault token and nonce data if available (from restricted token)
      if (restrictedTokenInfo) {
        asyncExecutionOptions.vaultAccessToken =
          restrictedTokenInfo.signedToken;
        asyncExecutionOptions.preallocatedNonce =
          restrictedTokenInfo.preallocatedNonce;
        asyncExecutionOptions.nonceSeed = restrictedTokenInfo.nonceSeed;
      }

      // console.timeLog("execute", "before calling async executor");

      // Execute using the async executor
      const asyncResult = await executeExternalBundlerAsync({
        id: idempotencyKey,
        executionOptions: asyncExecutionOptions,
        chainId: request.chainId,
        transactionParams: resolvedTransactionParams,
      });

      // console.timeLog("execute", "after calling async executor");

      // Handle errors from the async executor
      if (asyncResult.isErr()) {
        return errAsync(asyncResult.error);
      }

      // Async executor doesn't return userOpHash immediately, it's queued
      executionResult = {
        status: "QUEUED",
      };
    } else {
      // Execute using the sync executor
      const syncResult = await executeExternalBundler({
        id: idempotencyKey,
        chain,
        client,
        executionOptions,
        transactionParams: resolvedTransactionParams,
      });

      // Handle errors from the sync executor
      if (syncResult.isErr()) {
        if (syncResult.error.kind === "queue") {
          userOpHash = syncResult.error.userOpHash;
          executionResult = {
            status: "SUBMITTED",
            monitoringStatus: "CANNOT_MONITOR",
            userOpHash,
          };
        } else {
          return errAsync(syncResult.error);
        }
      } else {
        userOpHash = syncResult.value.data.userOpHash;
        executionResult = {
          status: "SUBMITTED",
          monitoringStatus: "WILL_MONITOR",
          userOpHash,
        };
      }
    }

    const executionParams: ExecutionParamsSerialized = {
      type: "AA" as const,
      entrypointAddress: executionOptions.entrypointAddress,
      smartAccountAddress: executionOptions.smartAccountAddress,
      signerAddress: executionOptions.signer.address,
    };

    // For database insertion, we need to ensure userOpHash is a string if status is SUBMITTED
    // If it's undefined, we'll use an empty string
    const dbExecutionResult = executionResult;

    // console.timeLog("execute", "before db insert");
    const dbTransactionEntry = yield* ResultAsync.fromPromise(
      db
        .insert(transactions)
        .values({
          id: idempotencyKey,
          batchIndex: 0,
          chainId: request.chainId,
          transactionParams: SuperJSON.serialize(resolvedTransactionParams)
            .json as TransactionParamsSerialized[],
          executionParams,
          executionResult: dbExecutionResult,
          from: executionParams.smartAccountAddress as Address,
        })
        .returning(),
      mapDbError,
    ).mapErr((e) =>
      buildTransactionDbEntryErr({
        error: e,
        executionParams,
        executionResult: dbExecutionResult,
      }),
    );
    // console.timeEnd("execute");

    return okAsync({
      executionResult,
      transactions: dbTransactionEntry,
      executionOptions,
    });
  });
}
