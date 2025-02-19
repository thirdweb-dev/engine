import { defineChain, type Address, type Chain } from "thirdweb";
import { smartWallet, type Account } from "thirdweb/wallets";
import { thirdwebClient } from "../thirdweb-client";
import { Result, ResultAsync } from "neverthrow";
import type { RpcErr, SmartAccountErr } from "../errors";

/**
 * Get a smart account for a given admin account
 * Optionally specify the account factory address, and entrypoint address
 * If no network is specified, it will default to ethereum mainnet
 */
export function getSmartAccount({
  adminAccount,
  accountSalt,
  accountFactoryAddress,
  entrypointAddress,
  chain,
}: {
  adminAccount: Account;
  accountSalt?: string;
  accountFactoryAddress?: Address;
  entrypointAddress?: Address;
  chain?: Chain;
}) {
  return Result.fromThrowable(
    () =>
      smartWallet({
        chain: chain ?? defineChain(1),
        sponsorGas: true,
        factoryAddress: accountFactoryAddress,
        overrides: {
          entrypointAddress,
          accountSalt,
        },
      }),
    (error) =>
      ({
        code: "smart_account_validation_failed",
        kind: "smart_account",
        message: "Unable to sync initialise smart account",
        status: 500,
        source: error,
      } as SmartAccountErr),
  )().asyncAndThen((smartAccount) =>
    ResultAsync.fromPromise(
      smartAccount.connect({
        client: thirdwebClient,
        personalAccount: adminAccount,
      }),
      (error) =>
        ({
          code: "smart_account_determination_failed",
          kind: "rpc",
          message: "Unable to determine smart account address",
          status: 500,
          source: error,
        } as RpcErr),
    ),
  );
}
