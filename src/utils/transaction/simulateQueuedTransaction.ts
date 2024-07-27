import {
  Address,
  PreparedTransaction,
  getContract,
  prepareContractCall,
  prepareTransaction,
  resolveMethod,
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
 * @throws if there is a simulation error
 */
export const doSimulateTransaction = async (
  transaction: AnyTransaction,
): Promise<string | null> => {
  const {
    chainId,
    to,
    functionName,
    functionArgs,
    data,
    value,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    signerAddress,
    accountAddress,
    target,
    from,
  } = transaction;

  const chain = await getChain(chainId);

  let preparedTransaction: PreparedTransaction;
  if (data) {
    // Resolve data.
    preparedTransaction = prepareTransaction({
      client: thirdwebClient,
      chain,
      to,
      data,
      value,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  } else if (
    from &&
    accountAddress &&
    signerAddress &&
    target &&
    functionName
  ) {
    try {
      // Resolve Target Contract
      const targetContract = getContract({
        client: thirdwebClient,
        chain,
        address: target as Address,
      });

      // Prepare UserOperation Transaction
      preparedTransaction = prepareContractCall({
        contract: targetContract,
        method: await resolveMethod(functionName),
        params: functionArgs ?? [],
        value: value,
        gas: gas,
      });
    } catch (error: any) {
      return error.toString();
    }
  } else if (to && functionName && functionArgs) {
    const contract = getContract({
      client: thirdwebClient,
      chain,
      address: to,
    });
    preparedTransaction = await prepareContractCall({
      contract,
      method: resolveMethod(functionName),
      params: functionArgs,
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
