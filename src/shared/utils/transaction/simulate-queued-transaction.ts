import { TransactionError } from "@thirdweb-dev/sdk";
import {
  prepareTransaction,
  simulateTransaction,
  type PreparedTransaction,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import type { Account } from "thirdweb/wallets";
import { getAccount } from "../account";
import { getSmartWalletV5 } from "../cache/get-smart-wallet-v5";
import { getChain } from "../chain";
import { thirdwebClient } from "../sdk";
import type { AnyTransaction } from "./types";
import type { Ecosystem } from "thirdweb/dist/types/wallets/in-app/core/wallet/types";

export type SimulateQueuedTransactionEnclaveParams = {
  clientId: string;
  authToken: string;
  ecosystem?: Ecosystem;
}

/**
 * Simulate the queued transaction.
 * @param transaction
 * @param enclave
 * @returns string - The simulation error, or null if no error.
 */
export const doSimulateTransaction = async (
  transaction: AnyTransaction, enclave: SimulateQueuedTransactionEnclaveParams | undefined = undefined,
): Promise<string | null> => {
  const {
    chainId,
    to,
    data,
    value,
    accountAddress,
    accountFactoryAddress,
    target,
    from,
  } = transaction;

  const chain = await getChain(chainId);

  let preparedTransaction: PreparedTransaction;
  if (data && (to || target)) {
    // Resolve data.
    preparedTransaction = prepareTransaction({
      client: thirdwebClient,
      chain,
      to: to ?? target,
      data,
      value,
    });
  } else {
    throw new Error(
      `Transaction cannot be simulated: ${stringify(transaction)}`,
    );
  }

  let account: Account | undefined;
  if (from && accountAddress) {
    account = await getSmartWalletV5({
      from,
      chain,
      accountAddress,
      accountFactoryAddress,
    });
  } else {
    account = await getAccount({
      chainId,
      from,
      ...(enclave ? {
        ecosystem: enclave.ecosystem,
        clientId: enclave.clientId,
        authToken: enclave.authToken,
      } : {})
    });
  }

  try {
    // Use an account to simulate the transaction to catch fund errors.
    await simulateTransaction({
      transaction: preparedTransaction,
      account,
    });
    return null;
  } catch (e: unknown) {
    if (!(e instanceof TransactionError)) {
      throw e;
    }
    // Error should be of type TransactionError in the thirdweb SDK.
    return `${e.name}: ${e.message}`;
  }
};
