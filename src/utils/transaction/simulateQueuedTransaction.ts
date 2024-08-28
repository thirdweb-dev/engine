import {
  PreparedTransaction,
  prepareTransaction,
  simulateTransaction,
} from "thirdweb";
import { stringify } from "thirdweb/utils";
import { Account } from "thirdweb/wallets";
import { getAccount } from "../account";
import { getSmartWalletV5 } from "../cache/getSmartWalletV5";
import { getChain } from "../chain";
import { thirdwebClient } from "../sdk";
import { AnyTransaction } from "./types";

/**
 * Simulate the queued transaction.
 * @param transaction
 * @returns string - The simulation error, or null if no error.
 */
export const doSimulateTransaction = async (
  transaction: AnyTransaction,
): Promise<string | null> => {
  const {
    chainId,
    to,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    accountAddress,
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
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
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
    });
  } else {
    account = await getAccount({
      chainId,
      from,
    });
  }

  try {
    // Use an account to simulate the transaction to catch fund errors.
    await simulateTransaction({
      transaction: preparedTransaction,
      account,
    });
    return null;
  } catch (e: any) {
    // Error should be of type TransactionError in the thirdweb SDK.
    return `${e.name}: ${e.message}`;
  }
};
