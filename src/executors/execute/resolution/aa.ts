import * as z from "zod";
import type { aaExecutionOptionsSchema } from "../../types";
import { errAsync, okAsync, safeTry } from "neverthrow";
import { getEngineAccount } from "../../../lib/accounts/accounts";
import type { AccountErr } from "../../../lib/errors";
import {
  DEFAULT_ACCOUNT_FACTORY_V0_7,
  ENTRYPOINT_ADDRESS_v0_7,
} from "thirdweb/wallets/smart";
import {
  isHex,
  stringToHex,
  type Address,
  type Chain,
  type ThirdwebClient,
} from "thirdweb";
import {
  getContractResult,
  predictAccountAddressResult,
} from "../../../lib/result-wrapped/thirdweb-sdk";
import type { ExecutionCredentials } from "../execute";

type AAExecutionOptions = z.infer<typeof aaExecutionOptionsSchema>;

function tryResolveSmartAccountDetailsFromStorage({
  signerAddress,
  smartAccountAddress,
}: {
  smartAccountAddress: Address;
  signerAddress: Address;
}) {
  return safeTry(async function* () {
    // Try to find smart account in DB
    const smartAccountResult = await getEngineAccount({
      address: smartAccountAddress,
      signerAddress: signerAddress,
    });

    if (smartAccountResult.isErr()) {
      // it's okay if the account was not found, but return any other received errors
      if (smartAccountResult.error.code !== "account_not_found") {
        return errAsync(smartAccountResult.error);
      }

      // we tried to look in db but did not find a smart account registered to this EOA, return null
      return okAsync(null);
    }

    // let's make sure that we received a smart account and not and EOA
    if ("account" in smartAccountResult.value) {
      return errAsync({
        kind: "account",
        code: "account_not_found",
        message: `Account not found: ${smartAccountAddress}. Provided smart account address is an EOA. EOA must not be used as a smart account.`,
        status: 400,
      } as AccountErr);
    }
    // we found the smart account, let's use it
    return okAsync({
      address: smartAccountResult.value.smartAccountDetails.address,
      factoryAddress:
        smartAccountResult.value.smartAccountDetails.factoryAddress,
      entrypointAddress:
        smartAccountResult.value.smartAccountDetails.entrypointAddress,
      accountSalt:
        smartAccountResult.value.smartAccountDetails.accountSalt ?? undefined,
    });
  });
}

export function resolve({
  options,
  chain,
  credentials,
  client,
  skipStorageLookup,
}: {
  options: AAExecutionOptions;
  chain: Chain;
  credentials: ExecutionCredentials;
  client: ThirdwebClient;
  skipStorageLookup?: boolean;
}) {
  return safeTry(async function* () {
    const engineSignerAccountResponse = yield* getEngineAccount({
      address: options.signerAddress,
      vaultAccessToken: credentials.vaultAccessToken,
    });

    // we expected to receive an eoa account but got a signer, which is invalid
    if ("signerAccount" in engineSignerAccountResponse) {
      return errAsync({
        kind: "account",
        code: "account_not_found",
        message: `Account not found: ${options.signerAddress}. Provided signer address is a smart account. Smart account must not be used as a signer.`,
        status: 400,
      } as AccountErr);
    }

    const signerAccount = engineSignerAccountResponse.account;

    // if only from is provided, we use it to fetch an account
    // we either get only account, or a signer + smartAccount

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

    if ("smartAccountAddress" in options && options.smartAccountAddress) {
      // the simplest case is if the request contains all the data we need: entrypointAddress, factoryAddress
      if (options.entrypointAddress && options.factoryAddress) {
        // good to go! let's just send provided execution options
        return okAsync({
          signerAccount,
          smartAccountDetails: {
            address: options.smartAccountAddress,
            factoryAddress: options.factoryAddress,
            entrypointAddress: options.entrypointAddress,
            accountSalt: undefined,
          },
        });
      }

      // we don't have all values, so look in storage before falling back to defaults
      const storedSmartAccountDetails = skipStorageLookup
        ? null
        : yield* tryResolveSmartAccountDetailsFromStorage({
            signerAddress: options.signerAddress,
            smartAccountAddress: options.smartAccountAddress,
          });

      const resolvedSmartAccountDetails = storedSmartAccountDetails ?? {
        accountSalt: undefined,
        entrypointAddress:
          options.entrypointAddress ?? (ENTRYPOINT_ADDRESS_v0_7 as Address),
        address: options.smartAccountAddress,
        factoryAddress:
          options.factoryAddress ?? (DEFAULT_ACCOUNT_FACTORY_V0_7 as Address),
      };

      return okAsync({
        signerAccount,
        smartAccountDetails: resolvedSmartAccountDetails,
      });
    }

    // smart account address was not provided, but we have the signer eoa
    // user has selected AA execution, so we use the provided factory and salt values, or assume defaults to get the execution options
    const factoryAddress =
      options.factoryAddress ?? (DEFAULT_ACCOUNT_FACTORY_V0_7 as Address);

    const accountSalt = options.accountSalt;

    const factoryContract = yield* getContractResult({
      address: factoryAddress,
      chain,
      client,
    });

    const saltHex =
      accountSalt && isHex(accountSalt)
        ? accountSalt
        : stringToHex(accountSalt ?? "");

    const predictedSmartAccountAddress = yield* predictAccountAddressResult({
      adminSigner: signerAccount.address as Address,
      contract: factoryContract,
      data: saltHex,
    });

    return okAsync({
      signerAccount,
      smartAccountDetails: {
        address: predictedSmartAccountAddress as Address,
        factoryAddress,
        entrypointAddress:
          options.entrypointAddress ?? (ENTRYPOINT_ADDRESS_v0_7 as Address),
        accountSalt: options.accountSalt,
      },
    });
  });
}
