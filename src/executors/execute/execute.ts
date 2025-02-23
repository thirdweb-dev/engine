import { errAsync, okAsync, ResultAsync, safeTry } from "neverthrow";
import { getEngineAccount } from "../../lib/accounts/accounts";
import type { EncodedExecutionRequest } from "../types";
import {
  buildTransactionDbEntryErr,
  mapDbError,
  type AccountErr,
  type EngineErr,
} from "../../lib/errors";
import { execute as executeExternalBundler } from "../external-bundler";
import { getChain } from "../../lib/chain";
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
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import { predictAccountAddress } from "thirdweb/extensions/erc4337";
import { thirdwebClient } from "../../lib/thirdweb-client";
import { db } from "../../db/connection";
import { transactions } from "../../db/schema";
import { randomUUID } from "node:crypto";
import SuperJSON from "superjson";
import type {
  ExecutionParamsSerialized,
  TransactionParamsSerialized,
} from "../../db/types";
import "./external-bundler-confirm-handler";

function getExecutionAccountFromRequest(
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
    // if only from is provided, we use it to fetch an account
    // we either get only account, or a signer + smartAccount
    if ("from" in request) {
      return okAsync(
        yield* getEngineAccount({
          address: request.from,
          encryptionPassword: request.encryptionPassword,
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
          encryptionPassword: request.encryptionPassword,
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
        encryptionPassword: request.encryptionPassword,
      });

      if (smartAccountResult.isErr()) {
        // it's okay if the account was not found, but return any other received errors
        if (smartAccountResult.error.code !== "account_not_found") {
          return errAsync(smartAccountResult.error);
        }

        // we tried to look in db but did not find a smart account registered to this EOA, let's use default values
        const engineSignerAccountResponse = yield* getEngineAccount({
          address: request.executionOptions.signerAddress,
          encryptionPassword: request.encryptionPassword,
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
      encryptionPassword: request.encryptionPassword,
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

    const chain = await getChain(Number.parseInt(request.chainId));

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
  return safeTry(async function* () {
    const chain = await getChain(Number.parseInt(request.chainId));

    const engineAccountResponse = yield* getExecutionAccountFromRequest(
      request,
    );

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
          ? engineAccountResponse.smartAccountDetails.accountSalt ?? undefined
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

    const executionResult = await executeExternalBundler({
      id: idempotencyKey,
      chain,
      client,
      executionOptions,
      transactionParams: resolvedTransactionParams,
    });

    let userOpHash: Hex;
    let didConfirmationQueueJobError = false;

    if (executionResult.isErr()) {
      if (executionResult.error.kind === "queue") {
        didConfirmationQueueJobError = true;
        userOpHash = executionResult.error.userOpHash;
      } else {
        return errAsync(executionResult.error);
      }
    } else {
      userOpHash = executionResult.value.data.userOpHash;
    }

    const executionParams: ExecutionParamsSerialized = {
      type: "AA" as const,
      entrypointAddress: executionOptions.entrypointAddress,
      smartAccountAddress: executionOptions.smartAccountAddress,
      signerAddress: executionOptions.signer.address,
    };

    const executionResultSerialized = {
      status: "SUBMITTED" as const,
      monitoringStatus: didConfirmationQueueJobError
        ? "CANNOT_MONITOR"
        : "WILL_MONITOR",
      userOpHash,
    } as const;

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
          executionResult: executionResultSerialized,
          from: executionParams.smartAccountAddress as Address,
        })
        .returning(),
      mapDbError,
    ).mapErr((e) =>
      buildTransactionDbEntryErr({
        error: e,
        executionParams,
        executionResult: executionResultSerialized,
      }),
    );

    return okAsync({
      executionResult: executionResultSerialized,
      transactions: dbTransactionEntry,
      executionOptions,
    });
  });
}
